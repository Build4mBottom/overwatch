import fs from "node:fs/promises";
import { invokeAgent } from "./agent";
import { parseCrash } from "./crash_parser";
import { logger } from "./logger";
import { buildPrompt } from "./prompt_builder";
import { scoreIncident } from "./scoring";
import { scanWorkspace } from "./workspace_scanner";
import { loadConfig } from "./config";
import { IncidentReport, RuntimeTelemetry } from "./types";
import { nowIso, stableIncidentId } from "./utils";
import { writePostmortem } from "./postmortem_generator";

function section(log: string, name: string): string {
  const marker = `${name}:`;
  const idx = log.indexOf(marker);
  if (idx === -1) return "";
  const rest = log.slice(idx + marker.length);
  const next = rest.search(/\n[A-Z]+:/);
  return (next === -1 ? rest : rest.slice(0, next)).trim();
}

function field(log: string, name: string): string {
  const found = log.split(/\r?\n/).find((line) => line.startsWith(`${name}=`));
  return found ? found.slice(name.length + 1).trim() : "";
}

async function main(): Promise<void> {
  const config = loadConfig();
  const sample = await fs.readFile("examples/sample_crash.log", "utf8");
  const startedAt = field(sample, "startedAt") || nowIso();
  const endedAt = field(sample, "endedAt") || nowIso();

  const telemetry: RuntimeTelemetry = {
    command: "node",
    args: ["target_app.js"],
    scenario: "malformed-json",
    startedAt,
    endedAt,
    durationMs: 115,
    exitCode: Number.parseInt(field(sample, "exitCode") || "1", 10),
    signal: null,
    stdout: section(sample, "STDOUT"),
    stderr: section(sample, "STDERR"),
    nodeVersion: process.version,
    platform: process.platform
  };

  logger.info("running offline deterministic incident replay", { source: "examples/sample_crash.log" });
  const crash = parseCrash(telemetry);
  const workspace = await scanWorkspace(crash, config);
  const scores = scoreIncident(crash, telemetry, workspace);
  const prompt = buildPrompt(telemetry, crash, workspace, scores);
  const agent = await invokeAgent(prompt, crash, scores, undefined);

  const report: IncidentReport = {
    id: stableIncidentId(telemetry.startedAt, "offline-malformed-json"),
    phase: "documented",
    telemetry,
    crash,
    workspace,
    scores,
    agent,
    generatedAt: nowIso()
  };

  await fs.writeFile("crash.log", sample, "utf8");
  await writePostmortem(report);
  logger.info("offline postmortem generated", {
    incidentId: report.id,
    severity: scores.severity.severity,
    tes: scores.triageEfficiencyScore,
    file: "POST_MORTEM.md"
  });
}

main().catch((error) => {
  logger.error("offline demo failed", { error: error instanceof Error ? error.stack : String(error) });
  process.exitCode = 1;
});
