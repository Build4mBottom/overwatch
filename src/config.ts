import fs from "node:fs";
import { RuntimeConfig } from "./types";

function loadDotEnv(filePath = ".env"): void {
  if (!fs.existsSync(filePath)) return;
  const body = fs.readFileSync(filePath, "utf8");
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function parseBool(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function parsePositiveInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name}: expected a positive integer`);
  }
  return parsed;
}

export function loadConfig(argv: string[] = process.argv.slice(2)): RuntimeConfig {
  loadDotEnv();
  const targetCommand = process.env.TARGET_COMMAND || "node";
  const targetArgs = (process.env.TARGET_ARGS || "target_app.js").split(" ").filter(Boolean);
  const scenario = process.env.SCENARIO || "malformed-json";
  const dryRun = argv.includes("--dry-run");

  return {
    targetCommand,
    targetArgs,
    scenario,
    cursorAgentCommand: process.env.CURSOR_AGENT_COMMAND || undefined,
    maxFileBytes: parsePositiveInt("MAX_FILE_BYTES", 65_536),
    maxWorkspaceFiles: parsePositiveInt("MAX_WORKSPACE_FILES", 80),
    readOnlyMode: parseBool(process.env.READ_ONLY_MODE, true),
    dryRun
  };
}

export function validateConfig(config: RuntimeConfig): void {
  if (!config.readOnlyMode) {
    throw new Error("READ_ONLY_MODE=false is not supported in Project Overwatch demo safety mode");
  }
  if (config.targetCommand.trim().length === 0) {
    throw new Error("TARGET_COMMAND must not be empty");
  }
  if (config.targetArgs.length === 0) {
    throw new Error("TARGET_ARGS must include a target program");
  }
}
