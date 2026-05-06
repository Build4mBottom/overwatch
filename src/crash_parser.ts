import path from "node:path";
import { CrashAnalysis, RuntimeTelemetry, StackFrame } from "./types";
import { clamp, normalizePath, uniq } from "./utils";

function parseHeader(stderr: string): { exceptionType: string; message: string } {
  const lines = stderr.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = lines.find((line) => /^[A-Za-z]*Error\b|^SyntaxError\b|^TypeError\b|^RangeError\b|^Error\b/.test(line));
  if (!header) {
    return { exceptionType: "UnknownError", message: "No structured exception header found" };
  }
  const idx = header.indexOf(":");
  if (idx === -1) {
    return { exceptionType: header, message: header };
  }
  return {
    exceptionType: header.slice(0, idx).trim(),
    message: header.slice(idx + 1).trim()
  };
}

function parseFrames(stderr: string): StackFrame[] {
  return stderr.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith("at ")) return [];
    const body = trimmed.slice(3);
    const hasParenthesizedLocation = body.endsWith(")") && body.includes("(");
    const openParen = hasParenthesizedLocation ? body.lastIndexOf("(") : -1;
    const functionName = hasParenthesizedLocation ? body.slice(0, openParen).trim() : undefined;
    const location = hasParenthesizedLocation ? body.slice(openParen + 1, -1) : body;
    const locationMatch = location.match(/^(.*):(\d+):(\d+)$/);
    if (!locationMatch) return [];

    const rawFile = locationMatch[1];
    if (rawFile === "<anonymous>" || rawFile.startsWith("node:")) return [];

    const file = normalizePath(path.resolve(rawFile));
    return [{
      raw: trimmed,
      functionName,
      file,
      line: Number.parseInt(locationMatch[2], 10),
      column: Number.parseInt(locationMatch[3], 10),
      isWorkspaceFrame: Boolean(file && !file.includes("node:internal") && !file.includes("/node_modules/"))
    }];
  });
}

function classifyFailure(exceptionType: string, message: string): string {
  const haystack = `${exceptionType} ${message}`.toLowerCase();
  if (haystack.includes("json")) return "payload_parse_failure";
  if (haystack.includes("contract")) return "api_contract_mismatch";
  if (haystack.includes("database")) return "stateful_dependency_failure";
  if (haystack.includes("timeout")) return "latency_budget_exhaustion";
  if (haystack.includes("retry storm")) return "retry_amplification";
  if (haystack.includes("worker")) return "worker_isolation_failure";
  if (haystack.includes("memory") || haystack.includes("heap")) return "resource_pressure";
  if (haystack.includes("dependency") || haystack.includes("cannot find module")) return "dependency_resolution_failure";
  if (haystack.includes("environment") || haystack.includes("config")) return "configuration_failure";
  return "runtime_exception";
}

function inferSubsystem(frames: StackFrame[], message: string): string {
  const firstFile = frames.find((frame) => frame.isWorkspaceFrame)?.file || "";
  const combined = `${firstFile} ${message}`.toLowerCase();
  if (combined.includes("payment") || combined.includes("settlement") || combined.includes("ledger")) return "payments";
  if (combined.includes("worker") || combined.includes("reconciliation")) return "workers";
  if (combined.includes("database") || combined.includes("db")) return "data-access";
  if (combined.includes("config") || combined.includes("env")) return "configuration";
  if (combined.includes("target_app")) return "request-ingestion";
  return "unknown-runtime";
}

export function parseCrash(telemetry: RuntimeTelemetry): CrashAnalysis {
  const { exceptionType, message } = parseHeader(telemetry.stderr);
  const stackFrames = parseFrames(telemetry.stderr);
  const failingFiles = uniq(stackFrames.filter((frame) => frame.isWorkspaceFrame && frame.file).map((frame) => frame.file as string));
  const failureClass = classifyFailure(exceptionType, message);
  const probableSubsystem = inferSubsystem(stackFrames, message);

  const confidence = clamp(
    0.35 +
    (stackFrames.length > 0 ? 0.25 : 0) +
    (failingFiles.length > 0 ? 0.2 : 0) +
    (failureClass !== "runtime_exception" ? 0.15 : 0),
    0.1,
    0.95
  );

  return {
    exceptionType,
    message,
    stackFrames,
    failingFiles,
    probableSubsystem,
    failureClass,
    runtimeMetadata: {
      exitCode: telemetry.exitCode,
      signal: telemetry.signal,
      durationMs: telemetry.durationMs,
      nodeVersion: telemetry.nodeVersion,
      platform: telemetry.platform,
      scenario: telemetry.scenario
    },
    confidence
  };
}
