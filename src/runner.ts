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
  logger.info("launching monitored process", { command: config.targetCommand, args: config.targetArgs, scenario: config.scenario });

  return new Promise((resolve, reject) => {
    const child = spawn(config.targetCommand, config.targetArgs, {
      env: { ...process.env, SCENARIO: config.scenario }
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      process.stdout.write(text);
    });
    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stderr += text;
      process.stderr.write(text);
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
    logger.info("configuration validated", { config });
    return;
  }

  const telemetry = await runTarget();
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
    logger.info("monitored process exited cleanly", { durationMs: telemetry.durationMs });
    return;
  }

  logger.warn("incident detected", { exitCode: telemetry.exitCode, durationMs: telemetry.durationMs });
  const crash = parseCrash(telemetry);
  const workspace = await scanWorkspace(crash, config);
  const scores = scoreIncident(crash, telemetry, workspace);
  const prompt = buildPrompt(telemetry, crash, workspace, scores);
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
  logger.info("postmortem generated", {
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
