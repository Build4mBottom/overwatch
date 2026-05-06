# Loom Walkthrough Script

## Opening Hook

"This is Project Overwatch. It is not an AI code generator. It is an AI-native incident commander. The input is simple: a backend process crashes. The output is an operationally actionable incident report with root cause, blast radius, severity, retry safety, patch proposal, rollback plan, and verification steps."

## Frame The Problem

"Most AI demos optimize for writing more code. In production, the expensive part is often not writing code. It is reconstructing context under pressure. When a service crashes, the on-call engineer has to copy logs, parse stack traces, open nearby files, infer ownership, estimate blast radius, and decide whether retry, rollback, or patch is safest."

## Show The Repo

"The repo is intentionally structured like an internal reliability tool. The runtime watcher is in `src/runner.ts`. The stack parser, workspace scanner, severity classifier, blast radius model, retry safety model, regression guard, prompt builder, and postmortem generator are separate modules."

## Run The Demo

"Now I will run the deterministic demo."

```bash
npm run demo
```

"The target backend process starts, emits structured logs, and then deterministically crashes. Overwatch captures stdout, stderr, exit code, timestamps, Node version, platform, and the configured failure scenario."

## Show Terminal Logs

"Notice that no human copied logs into a chatbot. The incident was detected by the process watcher."

## Show Crash Analysis

"The stack parser extracts the exception type, message, failing files, probable subsystem, failure class, and confidence. The workspace scanner then pulls in only relevant local context with safety limits."

## Show Postmortem

"Now Overwatch has generated `POST_MORTEM.md`. This is the durable incident artifact."

Open `POST_MORTEM.md`.

"The report includes executive summary, root cause, evidence, severity, blast radius, retry safety, regression warnings, read-only patch proposal, rollback plan, verification steps, and residual risk."

## Explain Safety

"The system does not auto-apply patches. That is deliberate. During incidents, autonomous hot-path writes are dangerous. Overwatch accelerates triage and decision-making while keeping humans in the approval loop."

## Explain Cursor-Native Design

"The `.cursorrules` file defines the operating posture for Cursor. `prompt_builder.ts` creates a workspace-aware operational prompt. `agent.ts` can invoke a Cursor-compatible command through `CURSOR_AGENT_COMMAND`, while the deterministic fallback keeps the demo reliable."

## Explain Priority Definition

"The important decision here was the problem selection. AI has made execution faster, so the scarce skill is priority definition. This project focuses AI on reducing downtime, preserving operational memory, and lowering cognitive load during incidents."

## Close

"Project Overwatch is an AI-native incident commander that belongs inside a modern engineering organization. It turns a crash into a structured recovery artifact in seconds."
