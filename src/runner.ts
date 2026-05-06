import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { invokeAgent } from "./agent";
import { loadConfig, validateConfig } from "./config";
import { parseCrash } from "./crash_parser";
import { logger } from "./logger";
import { buildPrompt } from "./prompt_builder";
import { scoreIncident } from "./scoring";
import { scanWorkspace } from "./workspace_scanner";
import { IncidentReport, RuntimeTelemetry } from "./types";
import { nowIso, stableIncidentId } from "./utils";
import { writePostmortem } from "./postmortem_generator";

async function runTarget(): Promise<RuntimeTelemetry> {
  const config = loadConfig();
  const startedAt = nowIso();
  const startedMs = Date.now();
  logger.step("watchdog", `monitoring ${config.targetArgs.join(" ")}`, { command: config.targetCommand, scenario: config.scenario });

  return new Promise((resolve, reject) => {
    const child = spawn(config.targetCommand, config.targetArgs, {
      env: { ...process.env, SCENARIO: config.scenario }
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        console.log(`[target:stdout] ${line}`);
      }
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
    });
    child.on("error", reject);
    child.on("close", (exitCode, signal) => {
      const endedAt = nowIso();
      resolve({
        command: config.targetCommand,
        args: config.targetArgs,
        scenario: config.scenario,
        startedAt,
        endedAt,
        durationMs: Date.now() - startedMs,
        exitCode,
        signal,
        stdout,
        stderr,
        nodeVersion: process.version,
        platform: process.platform,
        pid: child.pid
      });
    });
  });
}

async function main(): Promise<void> {
  const config = loadConfig();
  validateConfig(config);

  if (config.dryRun) {
    logger.step("config", "configuration validated", { readOnlyMode: config.readOnlyMode });
    return;
  }

  const telemetry = await runTarget();
  logger.step("telemetry", "process completed", { exitCode: telemetry.exitCode, durationMs: telemetry.durationMs });
  await fs.writeFile("crash.log", [
    `startedAt=${telemetry.startedAt}`,
    `endedAt=${telemetry.endedAt}`,
    `exitCode=${telemetry.exitCode}`,
    `signal=${telemetry.signal ?? "none"}`,
    "",
    "STDOUT:",
    telemetry.stdout,
    "",
    "STDERR:",
    telemetry.stderr
  ].join("\n"), "utf8");

  if (telemetry.exitCode === 0) {
    logger.step("watchdog", "monitored process exited cleanly", { durationMs: telemetry.durationMs });
    return;
  }

  logger.step("incident", "process exited unexpectedly", { exitCode: telemetry.exitCode });
  logger.step("telemetry", "stderr captured", { bytes: telemetry.stderr.length, firstLine: telemetry.stderr.split(/\r?\n/).find(Boolean) });
  const crash = parseCrash(telemetry);
  logger.step("parser", "stack trace parsed", {
    exception: crash.exceptionType,
    failureClass: crash.failureClass,
    failingFiles: crash.failingFiles.length
  });
  const workspace = await scanWorkspace(crash, config);
  logger.step("workspace", "local context scanned", { files: workspace.files.length });
  const scores = scoreIncident(crash, telemetry, workspace);
  logger.step("classifier", `severity=${scores.severity.severity}`, { score: scores.severity.score });
  logger.step("blast-radius", `subsystem=${crash.probableSubsystem}`, { score: scores.blastRadius.score });
  const prompt = buildPrompt(telemetry, crash, workspace, scores);
  logger.step("analysis", "generating incident report", { mode: config.cursorAgentCommand ? "cursor-agent" : "deterministic-offline" });
  const agent = await invokeAgent(prompt, crash, scores, config.cursorAgentCommand);

  const report: IncidentReport = {
    id: stableIncidentId(telemetry.startedAt, telemetry.scenario),
    phase: "documented",
    telemetry,
    crash,
    workspace,
    scores,
    agent,
    generatedAt: nowIso()
  };

  await writePostmortem(report);
  logger.step("output", "POST_MORTEM.md generated", {
    incidentId: report.id,
    severity: scores.severity.severity,
    tes: scores.triageEfficiencyScore,
    file: "POST_MORTEM.md"
  });
}

main().catch((error) => {
  logger.error("overwatch runner failed", { error: error instanceof Error ? error.stack : String(error) });
  process.exitCode = 1;
});
