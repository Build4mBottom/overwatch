# Loom Walkthrough Script

Target length: 2-3 minutes.

## Opening Hook

"Modern engineering bottlenecks are no longer only implementation speed. They are operational recovery, incident triage, and the time it takes to understand a failure under pressure. This is Overwatch: an AI-native autonomous incident commander. The input is a backend process crash. The output is an operationally actionable incident report with root cause, blast radius, severity, retry safety, patch proposal, rollback plan, and verification steps."

## Frame The Problem

"Most AI demos optimize for writing more code. In production, the expensive part is often not writing code. It is reconstructing context under pressure. When a service crashes, the on-call engineer has to copy logs, parse stack traces, open nearby files, infer ownership, estimate blast radius, and decide whether retry, rollback, or patch is safest."

## Show The Repo

"The repo is intentionally structured like an internal reliability tool. The runtime watcher is in `src/runner.ts`. The stack parser, workspace scanner, severity classifier, blast radius model, retry safety model, regression guard, prompt builder, and postmortem generator are separate modules."

## Run The Demo

"Now I will run the deterministic no-key demo. This proves the architecture without requiring the evaluator to configure secrets."

```bash
npm install
npm run demo:offline
```

"The demo replays a realistic backend crash from `examples/sample_crash.log`. Overwatch captures stderr, parses the stack trace, scans local workspace context, classifies severity, estimates blast radius, and generates a persistent postmortem."

## Show Terminal Logs

"The important thing in the terminal is the operational sequence: watchdog start, stderr captured, stack trace parsed, severity classified, blast radius estimated, incident report generated. No human copied logs into a chatbot."

Point at:

```text
[watchdog] replaying deterministic offline crash
[telemetry] stderr captured
[parser] stack trace parsed
[classifier] severity=SEV3
[blast-radius] subsystem=request-ingestion
[analysis] generating incident report
[output] POST_MORTEM.md generated
```

## Show Crash Analysis

"The stack parser extracts the exception type, message, failing files, probable subsystem, failure class, and confidence. The workspace scanner then pulls in only relevant local context with safety limits."

## Show Postmortem

"Now Overwatch has generated `POST_MORTEM.md`. This is the durable incident artifact."

Open `POST_MORTEM.md`.

"The report looks like a production incident document: incident ID, timestamps, severity, subsystem owner, confidence, timeline, evidence, blast radius, rollback risk, retry safety, read-only patch proposal, and verification checklist."

## Explain Safety

"The system does not auto-apply patches. That is deliberate. During incidents, autonomous hot-path writes are dangerous. Overwatch accelerates triage and decision-making while keeping humans in the approval loop."

## Explain Cursor-Native Design

"The `.cursorrules` file defines the operating posture for Cursor. `prompt_builder.ts` creates a workspace-aware operational prompt. `agent.ts` can invoke a Cursor-compatible command through `CURSOR_AGENT_COMMAND`, while the deterministic fallback keeps the demo reliable."

## Explain Priority Definition

"The important decision here was the problem selection. AI has made execution faster, so the scarce skill is priority definition. This project focuses AI on reducing downtime, preserving operational memory, and lowering cognitive load during incidents."

## Close

"Overwatch is not trying to be another code-generation wrapper. It is operational triage acceleration. It turns a crash into a structured recovery artifact in seconds, and it keeps the human in control where production safety matters."
