import path from "node:path";

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function normalizePath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}

export function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function truncate(value: string, maxChars: number): string {
  if (value.length <= maxChars) return value;
  return `${value.slice(0, maxChars)}\n...[truncated ${value.length - maxChars} chars]`;
}

export function stableIncidentId(startedAt: string, scenario: string): string {
  const compact = startedAt.replace(/[-:.TZ]/g, "").slice(0, 14);
  return `ovw-${compact}-${scenario.replace(/[^a-z0-9]+/gi, "-")}`;
}
