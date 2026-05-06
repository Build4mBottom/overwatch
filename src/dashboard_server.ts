import express from "express";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const app = express();
const port = 3000;
const host = "127.0.0.1";
const publicDir = path.resolve(process.cwd(), "public");
const postmortemPath = path.resolve(process.cwd(), "POST_MORTEM.md");

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
