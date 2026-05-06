import { nowIso } from "./utils";

type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, fields?: Record<string, unknown>): void;
  info(message: string, fields?: Record<string, unknown>): void;
  warn(message: string, fields?: Record<string, unknown>): void;
  error(message: string, fields?: Record<string, unknown>): void;
  step(component: string, message: string, fields?: Record<string, unknown>): void;
}

function formatFields(fields: Record<string, unknown> = {}): string {
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined && value !== "");
  if (entries.length === 0) return "";
  return ` ${entries.map(([key, value]) => `${key}=${JSON.stringify(value)}`).join(" ")}`;
}

function write(level: LogLevel, component: string, message: string, fields: Record<string, unknown> = {}): void {
  const line = `[${component}] ${message}${formatFields({ ...fields, ts: nowIso(), level })}`;
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

export const logger: Logger = {
  debug: (message, fields) => write("debug", "debug", message, fields),
  info: (message, fields) => write("info", "overwatch", message, fields),
  warn: (message, fields) => write("warn", "incident", message, fields),
  error: (message, fields) => write("error", "error", message, fields),
  step: (component, message, fields) => write("info", component, message, fields)
};
