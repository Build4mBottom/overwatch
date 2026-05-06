import fs from "node:fs/promises";
import path from "node:path";
import { CrashAnalysis, RuntimeConfig, WorkspaceContext, WorkspaceFile } from "./types";
import { normalizePath, uniq } from "./utils";

const ALWAYS_INCLUDE = ["package.json", "tsconfig.json", ".cursorrules", "target_app.js"];
const EXTENSIONS = new Set([".ts", ".js", ".json", ".md", ".env.example"]);

async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readLimited(filePath: string, reason: string, maxBytes: number): Promise<WorkspaceFile | undefined> {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size > maxBytes) return undefined;
  const content = await fs.readFile(filePath, "utf8");
  return {
    path: normalizePath(path.resolve(filePath)),
    bytes: stat.size,
    reason,
    content
  };
}

async function collectSrcFiles(limit: number): Promise<string[]> {
  const srcDir = path.resolve("src");
  if (!(await exists(srcDir))) return [];
  const entries = await fs.readdir(srcDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && EXTENSIONS.has(path.extname(entry.name)))
    .slice(0, limit)
    .map((entry) => path.join(srcDir, entry.name));
}

export async function scanWorkspace(crash: CrashAnalysis, config: RuntimeConfig): Promise<WorkspaceContext> {
  const candidatePaths = [
    ...crash.failingFiles,
    ...ALWAYS_INCLUDE.map((file) => path.resolve(file)),
    ...(await collectSrcFiles(config.maxWorkspaceFiles))
  ];

  const files: WorkspaceFile[] = [];
  for (const filePath of uniq(candidatePaths).slice(0, config.maxWorkspaceFiles)) {
    if (!(await exists(filePath))) continue;
    const reason = crash.failingFiles.includes(normalizePath(path.resolve(filePath)))
      ? "direct stack frame"
      : "operational context";
    const file = await readLimited(filePath, reason, config.maxFileBytes);
    if (file) files.push(file);
  }

  const packageFile = files.find((file) => file.path.endsWith("/package.json"));

  return {
    files,
    packageSummary: packageFile?.content,
    scannedAt: new Date().toISOString()
  };
}
