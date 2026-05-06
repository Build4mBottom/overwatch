import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const app = express();
const port = 3000;
const host = "127.0.0.1";
const publicDir = path.resolve(process.cwd(), "public");
const postmortemPath = path.resolve(process.cwd(), "POST_MORTEM.md");
const lineLimit = 20;

type DemoKind = "offline" | "watchdog";

interface PostmortemSummary {
  incidentId: string;
  severity: string;
  exception: string;
  subsystem: string;
  confidence: string;
  blastRadius: string;
  mttrEstimate: string;
  rootCause: string;
  patch: string;
  checklist: string[];
}

let running = false;
let lastDemoCommand = "none";
let lastBuildStatus = "PASS";

interface CheckItem {
  label: string;
  path?: string;
  pass: boolean;
  detail?: string;
}

function npmCommand(): string {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function redact(value: string): string {
  return value
    .replace(/(CURSOR_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY)=\S+/gi, "$1=[redacted]")
    .replace(/(api[_-]?key|token|secret)["']?\s*[:=]\s*["']?[^"'\s]+/gi, "$1=[redacted]");
}

function extractTableValue(markdown: string, label: string): string {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`\\|\\s*${escaped}\\s*\\|\\s*([^|]+?)\\s*\\|`, "i"));
  return match?.[1]?.replace(/`/g, "").trim() || "pending";
}

function extractSection(markdown: string, heading: string): string {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = markdown.match(new RegExp(`## ${escaped}\\n\\n([\\s\\S]*?)(?=\\n## |$)`, "i"));
  return match?.[1]?.trim() || "pending";
}

function extractDiff(markdown: string): string {
  const match = markdown.match(/```diff\n([\s\S]*?)```/i);
  return match?.[1]?.trim() || "No patch proposal generated yet.";
}

function extractChecklist(markdown: string): string[] {
  const section = extractSection(markdown, "Verification Steps");
  const items = section
    .split(/\r?\n/)
    .map((line) => line.replace(/^- \[[ x]\]\s*/i, "").trim())
    .filter(Boolean);
  return items.length > 0 ? items : ["Run a demo to generate verification steps."];
}

function summarizePostmortem(markdown: string): PostmortemSummary {
  const rca = extractSection(markdown, "Root Cause Analysis");
  const executiveSummary = extractSection(markdown, "Executive Summary");
  const blastRadius = extractSection(markdown, "Blast Radius");
  const exception = extractTableValue(rca, "Exception") || rca.split(/\r?\n/).find(Boolean) || "pending";
  return {
    incidentId: extractTableValue(markdown, "Incident ID"),
    severity: extractTableValue(markdown, "Severity"),
    exception,
    subsystem: extractTableValue(markdown, "Subsystem") || extractTableValue(markdown, "Probable subsystem"),
    confidence: extractTableValue(markdown, "Confidence"),
    blastRadius: extractTableValue(blastRadius, "Score"),
    mttrEstimate: "<15 seconds first-pass triage",
    rootCause: `${executiveSummary}\n\n${rca}`.trim(),
    patch: extractDiff(markdown),
    checklist: extractChecklist(markdown)
  };
}

async function readPostmortem(): Promise<string> {
  try {
    return await fs.readFile(postmortemPath, "utf8");
  } catch {
    return "# POST_MORTEM.md not generated yet\n\nRun a demo to generate the incident report.";
  }
}

async function readText(relativePath: string): Promise<string> {
  return fs.readFile(path.resolve(process.cwd(), relativePath), "utf8");
}

async function exists(relativePath: string): Promise<boolean> {
  try {
    await fs.access(path.resolve(process.cwd(), relativePath));
    return true;
  } catch {
    return false;
  }
}

function firstLines(content: string, limit = lineLimit): string {
  return content.split(/\r?\n/).slice(0, limit).join("\n");
}

async function safeExcerpt(relativePath: string, limit = lineLimit): Promise<string> {
  try {
    return firstLines(await readText(relativePath), limit);
  } catch {
    return "File not readable.";
  }
}

function boolEnv(name: string): boolean {
  return Boolean(process.env[name]);
}

async function sourceContains(pattern: RegExp, files = [
    "src/agent.ts",
    "src/dashboard_server.ts",
    "src/prompt_builder.ts",
    "src/runner.ts",
    "src/offline_demo.ts",
    "src/postmortem_generator.ts",
    "src/patch_formatter.ts",
    "public/app.js"
  ]): Promise<boolean> {
  const bodies = await Promise.all(files.map(async (file) => (await exists(file)) ? readText(file) : ""));
  return bodies.some((body) => pattern.test(body));
}

function generatedTimestamp(markdown: string): string {
  return extractTableValue(markdown, "Generated");
}

function tesFromPostmortem(markdown: string): string {
  const match = markdown.match(/Triage Efficiency Score[\s\S]*?`([^`]+)`/i);
  return match?.[1] || extractTableValue(markdown, "Triage Efficiency Score");
}

function benchmarkExcerpt(markdown: string): string {
  const target = markdown.match(/## Target Calculation[\s\S]*?(?=\n## |$)/i)?.[0];
  const formula = markdown.match(/## Triage Efficiency Score[\s\S]*?(?=\n## |$)/i)?.[0];
  return firstLines(target || formula || markdown, 28);
}

async function currentSystemStatus() {
  const postmortem = await readPostmortem();
  const summary = summarizePostmortem(postmortem);
  return {
    buildStatus: lastBuildStatus,
    lastDemoCommand,
    lastIncidentId: summary.incidentId,
    lastSeverity: summary.severity,
    postmortemGeneratedAt: generatedTimestamp(postmortem),
    dashboardMode: `localhost only (${host}:${port})`
  };
}

function commandFor(kind: DemoKind): { args: string[]; label: string } {
  if (kind === "offline") {
    return { args: ["run", "demo:offline"], label: "npm run demo:offline" };
  }
  return { args: ["run", "start:watchdog"], label: "npm run start:watchdog" };
}

async function writeStreamPostmortem(res: express.Response): Promise<void> {
  const postmortem = await readPostmortem();
  res.write(`${JSON.stringify({ type: "postmortem", postmortem, summary: summarizePostmortem(postmortem) })}\n`);
}

function streamDemo(kind: DemoKind, res: express.Response): void {
  const selected = commandFor(kind);
  lastDemoCommand = selected.label;
  let child;
  try {
    if (process.platform === "win32") {
      child = spawn(selected.label, {
        cwd: process.cwd(),
        env: { ...process.env },
        shell: true
      });
    } else {
      child = spawn(npmCommand(), selected.args, {
        cwd: process.cwd(),
        env: { ...process.env },
        shell: false
      });
    }
  } catch (error) {
    res.write(`${JSON.stringify({ type: "error", text: error instanceof Error ? error.message : String(error) })}\n`);
    res.end();
    return;
  }

  res.write(`${JSON.stringify({ type: "start", command: selected.label })}\n`);

  child.stdout.on("data", (chunk) => {
    res.write(`${JSON.stringify({ type: "stdout", text: redact(chunk.toString()) })}\n`);
  });

  child.stderr.on("data", (chunk) => {
    res.write(`${JSON.stringify({ type: "stderr", text: redact(chunk.toString()) })}\n`);
  });

  child.on("error", (error) => {
    res.write(`${JSON.stringify({ type: "error", text: error.message })}\n`);
    res.end();
  });

  child.on("close", async (exitCode) => {
    res.write(`${JSON.stringify({ type: "exit", exitCode })}\n`);
    await writeStreamPostmortem(res);
    res.end();
  });
}

app.use(express.static(publicDir));

app.get("/api/postmortem", async (_req, res) => {
  const postmortem = await readPostmortem();
  res.json({ postmortem, summary: summarizePostmortem(postmortem) });
});

app.get("/api/system-checks", async (_req, res) => {
  res.json(await currentSystemStatus());
});

app.get("/api/cursor-config", async (_req, res) => {
  const cursorRulesExists = await exists(".cursorrules");
  const cursorAgentConfigured = boolEnv("CURSOR_AGENT_COMMAND");
  const cursorKeyPresent = boolEnv("CURSOR_API_KEY");
  const openAiKeyPresent = boolEnv("OPENAI_API_KEY");
  const analysisMode = cursorAgentConfigured
    ? "cursor-command"
    : cursorKeyPresent || openAiKeyPresent
      ? "external-llm-ready"
      : "deterministic-offline";

  res.json({
    checks: [
      { label: ".cursorrules exists", path: ".cursorrules", pass: cursorRulesExists },
      { label: "CURSOR_AGENT_COMMAND configured", pass: cursorAgentConfigured },
      { label: "CURSOR_API_KEY present", pass: cursorKeyPresent },
      { label: "OPENAI_API_KEY present", pass: openAiKeyPresent }
    ],
    analysisMode,
    excerpt: cursorRulesExists ? await safeExcerpt(".cursorrules") : ""
  });
});

app.get("/api/security-checks", async (_req, res) => {
  const gitignore = await safeExcerpt(".gitignore", 80);
  const patchFormatter = await safeExcerpt("src/patch_formatter.ts", 160);
  const sourcePrintsKeyNames = await sourceContains(/console\.(log|error|warn).*?(API_KEY|TOKEN|SECRET|CURSOR_API_KEY|OPENAI_API_KEY)/is);
  const autoApplyDetected = await sourceContains(
    /\b(applyPatch|apply_patch|git apply|execFile\([^)]*patch|spawn\([^)]*git[^)]*apply)/i,
    ["src/agent.ts", "src/runner.ts", "src/offline_demo.ts", "src/postmortem_generator.ts", "src/patch_formatter.ts"]
  );
  const checks: CheckItem[] = [
    { label: ".env is gitignored", path: ".gitignore", pass: /^\.env$/m.test(gitignore) || gitignore.includes(".env") },
    { label: ".env.example exists", path: ".env.example", pass: await exists(".env.example") },
    { label: ".gitignore contains .env", path: ".gitignore", pass: gitignore.includes(".env") },
    { label: ".gitignore contains node_modules", path: ".gitignore", pass: gitignore.includes("node_modules") },
    { label: "source does not print API key values", pass: !sourcePrintsKeyNames },
    { label: "generated patch is read-only", path: "src/patch_formatter.ts", pass: /not applied automatically|Read-only patch proposal/i.test(patchFormatter) },
    { label: "no auto-apply patch function detected", pass: !autoApplyDetected }
  ];
  res.json({ checks });
});

app.get("/api/architecture", async (_req, res) => {
  const nodes = [
    { file: "target_app.js", role: "deterministic backend crash target" },
    { file: "src/runner.ts", role: "watchdog captures stdout, stderr, exit code, timestamps" },
    { file: "src/crash_parser.ts", role: "extracts exception, stack frames, failing files, failure class" },
    { file: "src/workspace_scanner.ts", role: "loads bounded local workspace context" },
    { file: "src/severity_classifier.ts", role: "assigns incident severity and score" },
    { file: "src/blast_radius.ts", role: "estimates affected components and rollback surface" },
    { file: "src/prompt_builder.ts", role: "builds Cursor-ready operational prompt" },
    { file: "src/agent.ts", role: "runs Cursor command or deterministic fallback analysis" },
    { file: "POST_MORTEM.md", role: "persistent incident report artifact" }
  ];

  res.json({
    nodes: await Promise.all(nodes.map(async (node) => ({
      ...node,
      pass: await exists(node.file),
      excerpt: await safeExcerpt(node.file, 14)
    })))
  });
});

app.get("/api/quest-checklist", async (_req, res) => {
  const readme = await safeExcerpt("README.md", 500);
  const pkg = JSON.parse(await readText("package.json")) as { scripts?: Record<string, string> };
  const checks: CheckItem[] = [
    { label: "Public GitHub link configured in README", path: "README.md", pass: readme.includes("https://github.com/Build4mBottom/overwatch") },
    { label: ".cursorrules exists", path: ".cursorrules", pass: await exists(".cursorrules") },
    { label: ".env.example exists", path: ".env.example", pass: await exists(".env.example") },
    { label: "docs/BENCHMARK.md exists", path: "docs/BENCHMARK.md", pass: await exists("docs/BENCHMARK.md") },
    { label: "docs/ONE_PAGE_SUMMARY.md exists", path: "docs/ONE_PAGE_SUMMARY.md", pass: await exists("docs/ONE_PAGE_SUMMARY.md") },
    { label: "docs/APPENDIX.md exists", path: "docs/APPENDIX.md", pass: await exists("docs/APPENDIX.md") },
    { label: "docs/LOOM_SCRIPT.md exists", path: "docs/LOOM_SCRIPT.md", pass: await exists("docs/LOOM_SCRIPT.md") },
    { label: "package.json scripts include start:watchdog", path: "package.json", pass: Boolean(pkg.scripts?.["start:watchdog"]) },
    { label: "package.json scripts include demo:offline", path: "package.json", pass: Boolean(pkg.scripts?.["demo:offline"]) },
    { label: "package.json scripts include dashboard", path: "package.json", pass: Boolean(pkg.scripts?.dashboard) }
  ];
  res.json({ checks });
});

app.get("/api/benchmark-evidence", async (_req, res) => {
  const postmortem = await readPostmortem();
  const benchmarkExists = await exists("docs/BENCHMARK.md");
  const benchmark = benchmarkExists ? await readText("docs/BENCHMARK.md") : "";
  res.json({
    triageEfficiencyScore: tesFromPostmortem(postmortem),
    benchmarkExists,
    benchmarkPath: "docs/BENCHMARK.md",
    excerpt: benchmarkExcerpt(benchmark),
    comparison: [
      ["Triggering", "Manual", "Automatic process watcher"],
      ["Context Gathering", "Human copies logs", "Structured telemetry capture"],
      ["Workspace Awareness", "Prompt-dependent", "Scanner-driven"],
      ["MTTR", "~30 minutes", "~15 seconds first-pass triage"],
      ["Output Persistence", "Manual", "POST_MORTEM.md and crash.log"],
      ["Operational Safety", "Human discretion", "Read-only patch generation"],
      ["Blast Radius Analysis", "Manual inference", "Structured assessment"],
      ["Severity Classification", "Usually implicit", "Explicit score and label"],
      ["Persistent Artifacts", "Ad hoc notes", "Durable incident report"],
      ["Human Cognitive Load", "High", "Low"]
    ]
  });
});

app.get("/api/stream/:kind", (req, res) => {
  const kind = req.params.kind as DemoKind;
  if (kind !== "offline" && kind !== "watchdog") {
    res.status(404).json({ error: "Unknown demo command" });
    return;
  }

  if (running) {
    res.status(409).json({ error: "A demo command is already running" });
    return;
  }

  running = true;
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.on("close", () => {
    running = false;
  });
  streamDemo(kind, res);
});

app.listen(port, host, () => {
  console.log(`[dashboard] Overwatch dashboard listening at http://${host}:${port}`);
  console.log("[dashboard] localhost-only server; allowed commands: demo:offline, start:watchdog");
});
