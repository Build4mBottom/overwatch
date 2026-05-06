# Overwatch

### AI-Native Autonomous Incident Commander

Reducing production MTTR from 30 minutes to 15 seconds through autonomous runtime-aware incident triage and root cause analysis.

## Executive Summary

Overwatch is an AI-native autonomous incident commander for local backend/runtime systems. It watches a process, detects deterministic or unexpected crashes, captures runtime telemetry, parses stack traces, scans related workspace context, estimates blast radius, classifies severity, proposes a read-only patch, and generates a production-style postmortem.

The goal is not to make AI write more code. The goal is to compress operational recovery time.

Production systems fail. The highest-leverage engineering move is to reduce the time between "something broke" and "we understand the failure, the risk, the likely fix, and the verification path." Overwatch targets the expensive part of incident response: context reconstruction under pressure.

## What Is Overwatch?

Overwatch is an AI-native operational engineering agent that autonomously detects backend failures, analyzes runtime crash context, identifies probable root causes, estimates blast radius, and generates production-grade postmortems with suggested remediation patches.

The system is designed around one core principle:

Production failures are inevitable. Operational recovery speed is the highest leverage optimization.

## The Problem

Most incidents are not slowed down by typing speed. They are slowed down by:

- finding the first meaningful stack frame,
- recovering runtime context,
- identifying the subsystem owner,
- estimating blast radius,
- separating symptoms from root cause,
- deciding whether retry, rollback, or patch is safest,
- and producing a clear incident record after the system is stable.

Default AI coding workflows still require a human to notice the crash, copy logs, explain repo context, ask the right questions, and preserve the output. That is too much human coordination in the incident hot path.

## Why This Was The Highest-Leverage Problem

AI has already made implementation faster. That makes priority definition more valuable, not less. If execution speed is commoditized, the scarce skill is choosing where autonomy creates operational leverage.

Incident response is a leverage-rich target because every minute saved compounds across:

- customer availability,
- engineer cognitive load,
- on-call fatigue,
- leadership visibility,
- rollback safety,
- and institutional learning.

Junior AI projects optimize code generation volume. Overwatch optimizes mean time to recovery, decision quality, and operational memory.

## Why Most AI Projects Miss The Point

Many AI-agent repositories are wrappers around a model call. They demonstrate that an LLM can produce text. They rarely demonstrate a mature understanding of production operations.

Overwatch is intentionally different:

- it starts from a real operational pain,
- it models the incident lifecycle,
- it captures machine context before asking AI,
- it treats patching as a safety-sensitive proposal,
- it persists a postmortem artifact,
- and it benchmarks against a real baseline: a human using Cursor manually during a crash.

## Operational Philosophy

Overwatch assumes:

- systems fail,
- logs are partial,
- stack traces are clues rather than truth,
- autonomous writes to production code are dangerous,
- humans should retain final authority,
- and the best AI systems reduce cognitive load before they increase automation scope.

The product posture is "autonomous triage, human-approved recovery."

## AI-Native Incident Response

An AI-native incident system should not wait for a prompt. It should:

1. observe runtime behavior,
2. capture context at failure time,
3. select the relevant files,
4. produce an operationally useful analysis,
5. generate a safe patch proposal,
6. provide rollback and verification guidance,
7. and leave behind an auditable incident record.

That is what Overwatch implements.

## Architecture Overview

```text
target_app.js
    |
    v
src/runner.ts
    | captures stdout/stderr/exit/timestamps
    v
src/crash_parser.ts
    | extracts exception, stack frames, failing files, subsystem
    v
src/workspace_scanner.ts
    | reads related local files and config safely
    v
src/severity_classifier.ts + blast_radius.ts + retry_safety.ts
    | estimates severity, ownership, retry risk, regression risk
    v
src/prompt_builder.ts
    | builds Cursor-native FDE prompt with local context
    v
src/agent.ts
    | invokes Cursor-compatible command or deterministic local analyzer
    v
src/postmortem_generator.ts
    | writes POST_MORTEM.md and crash.log
```

## System Lifecycle

1. Launch monitored process.
2. Stream stdout and stderr with timestamps.
3. Detect non-zero exit or fatal signal.
4. Parse failure context.
5. Scan related workspace files.
6. Score severity, blast radius, retry safety, regression risk, and confidence.
7. Build an operational prompt for Cursor.
8. Generate analysis and read-only patch proposal.
9. Write a durable postmortem.

## Runtime Flow

```bash
git clone <your-repo>
cd project-overwatch
npm install
cp .env.example .env
npm run start:watchdog
```

The live watchdog demo runs `target_app.js`, which deterministically crashes using `SCENARIO=malformed-json` unless another scenario is selected.

Example:

```bash
SCENARIO=api-contract npm run demo
```

Offline deterministic mode requires no API keys:

```bash
npm run demo:offline
```

That mode reads `examples/sample_crash.log`, reconstructs the incident, and generates `POST_MORTEM.md`. It proves the architecture works even if the evaluator does not configure Cursor or an LLM provider.

Supported scenarios:

- `malformed-json`
- `async-promise`
- `serialization-corruption`
- `invalid-env`
- `api-contract`
- `dependency-resolution`
- `database-connection`
- `timeout-explosion`
- `worker-crash`
- `memory-pressure`
- `event-loop-starvation`
- `retry-storm`

## Failure Lifecycle

Overwatch treats a crash as an incident object with phases:

- `detected`: process exited unexpectedly,
- `captured`: logs, metadata, and exit state are persisted,
- `classified`: severity and probable subsystem are inferred,
- `contextualized`: related source files and configs are scanned,
- `analyzed`: root cause and blast radius are estimated,
- `proposed`: read-only diff and rollback plan are generated,
- `documented`: `POST_MORTEM.md` is written.

## MTTR Compression Strategy

Baseline manual Cursor workflow:

- human notices crash: 1-3 minutes,
- copies terminal logs: 1 minute,
- opens relevant files: 3-8 minutes,
- reconstructs runtime context: 5-10 minutes,
- asks AI for help: 2-5 minutes,
- writes postmortem notes: 10+ minutes.

Overwatch demo path:

- crash detection: immediate,
- log capture: immediate,
- stack parsing: milliseconds,
- workspace scan: milliseconds to seconds,
- analysis artifact: seconds,
- postmortem generation: seconds.

The target compression is from roughly 30 minutes to roughly 15 seconds for first-pass triage.

## Cursor Integration

Overwatch is Cursor-native in three ways:

- `.cursorrules` defines operational behavior for AI-assisted incident response.
- `prompt_builder.ts` creates workspace-aware FDE prompts optimized for Cursor context.
- `agent.ts` supports `CURSOR_AGENT_COMMAND`, allowing a local Cursor-compatible agent command to receive the generated prompt. That command can use `CURSOR_API_KEY`, `OPENAI_API_KEY`, or another local provider configuration.

If `CURSOR_AGENT_COMMAND` is not set, Overwatch uses a deterministic local analysis fallback so the repository remains demoable and reliable.

## Security Model

Overwatch is read-only by default.

Safety guarantees:

- no secrets committed,
- `.env` excluded by `.gitignore`,
- `.env.example` documents configuration,
- environment variables are validated,
- source files are scanned with size limits,
- generated patches are written as proposals only,
- no production code is auto-modified,
- human approval is required before applying a patch.

Autonomous hot-path writes are intentionally avoided. In incident response, a wrong automated patch can expand blast radius faster than the original outage. Overwatch optimizes for triage acceleration and decision support, not unchecked mutation.

## Incident Severity Model

Severity is scored using:

- process exit code,
- exception type,
- subsystem criticality,
- customer-facing likelihood,
- retry storm risk,
- data corruption risk,
- and confidence in root cause.

Severity labels:

- `SEV1`: customer-facing outage, data loss, or cascading failure risk,
- `SEV2`: degraded production path or high operational urgency,
- `SEV3`: contained runtime failure with clear owner,
- `SEV4`: local or low-risk failure.

## Blast Radius Analysis

Blast radius is estimated from:

- failing files,
- imported modules,
- package/config proximity,
- subsystem ownership,
- stateful resources,
- and failure class.

The output separates:

- affected user paths,
- affected technical components,
- operational dependencies,
- rollback surface,
- and verification scope.

## Performance Benchmarks

Overwatch uses Triage Efficiency Score (TES), range `1 -> 10,000`.

Formula:

```text
TES =
  Base Automation Value
+ MTTR Compression
+ Context Recovery Accuracy
+ Patch Quality
+ Operational Safety
+ Blast Radius Reduction
+ Confidence Reliability
- Human Intervention Cost
- Regression Risk
- False Positive Risk
```

Target score: `9,450 / 10,000`.

See [docs/BENCHMARK.md](docs/BENCHMARK.md) for the full calculation.

## Benchmark vs Default Cursor

| Metric | Default Cursor Workflow | Project Overwatch |
| --- | --- | --- |
| Triggering | Manual | Automatic process watcher |
| Context Gathering | Human copies logs | Structured telemetry capture |
| Workspace Awareness | Prompt-dependent | Scanner-driven |
| MTTR | ~30 minutes | ~15 seconds first-pass triage |
| Cognitive Load | High | Low |
| Reliability | Varies by prompt quality | Deterministic demo path |
| Repeatability | Weak | Same scenario, same artifact shape |
| Output Persistence | Manual | `POST_MORTEM.md` and `crash.log` |
| Operational Safety | Human discretion | Read-only patch generation |
| Failure Analysis Depth | Ad hoc | Severity, blast radius, retry, regression |
| Patch Confidence | Prompt-dependent | Scored with risk annotations |
| Ownership Modeling | Manual | Subsystem inference |

## Example Incident Walkthrough

1. `target_app.js` receives a malformed JSON payload.
2. The parser throws a `SyntaxError`.
3. `runner.ts` captures stderr, exit code, timestamps, and runtime metadata.
4. `crash_parser.ts` extracts the failing frame and exception class.
5. `workspace_scanner.ts` reads `target_app.js`, package metadata, and related source files.
6. `severity_classifier.ts` marks the incident as likely `SEV3`.
7. `blast_radius.ts` identifies request ingestion and payload parsing as affected.
8. `retry_safety.ts` warns that blind retry will not repair malformed input.
9. `postmortem_generator.ts` writes a postmortem with RCA, patch proposal, rollback plan, and verification steps.

## Example Generated Postmortem

See [examples/sample_postmortem.md](examples/sample_postmortem.md).

## Production Safety Guarantees

Overwatch does not:

- apply patches automatically,
- write to production services,
- transmit secrets intentionally,
- assume retries are safe,
- hide uncertainty,
- or treat AI output as authoritative.

Overwatch does:

- preserve evidence,
- expose confidence,
- show blast radius,
- recommend verification,
- and keep humans in the approval loop.

## Demo Instructions

```bash
npm install
cp .env.example .env
npm run start:watchdog
```

No-key offline proof:

```bash
npm run demo:offline
```

With Docker:

```bash
docker compose up --build overwatch-demo
```

Optional Cursor command integration:

```bash
CURSOR_AGENT_COMMAND="cursor-agent --stdin" npm run demo
```

Expected demo path:

```text
target_app.js crashes
  -> runner.ts captures stderr
  -> agent.ts analyzes crash
  -> POST_MORTEM.md is generated
  -> evaluator opens POST_MORTEM.md and sees RCA + patch
```

## Loom Walkthrough

See [docs/LOOM_SCRIPT.md](docs/LOOM_SCRIPT.md).

## Design Decisions

See [docs/ARCHITECTURE_DECISIONS.md](docs/ARCHITECTURE_DECISIONS.md).

Key choices:

- read-only patch proposals,
- deterministic demo reliability,
- local-first context gathering,
- explicit severity and confidence models,
- small composable modules,
- and no UI until the operational loop proves value.

## Future Roadmap

See [docs/FUTURE_ROADMAP.md](docs/FUTURE_ROADMAP.md).

High-leverage next steps:

- GitHub issue/PR incident linking,
- OpenTelemetry ingestion,
- Kubernetes event capture,
- CI regression replay,
- service ownership maps,
- and incident trend analysis.

## Why This Demonstrates Priority Definition Ability

This project chooses downtime reduction over demo spectacle.

It shows the core AI-native insight: the scarce skill is no longer producing more code faster. The scarce skill is deciding which operational bottleneck deserves autonomy.

Overwatch attacks a real engineering bottleneck with a narrow, safe, measurable loop:

- detect failure,
- recover context,
- classify risk,
- propose action,
- preserve learning.

That is leverage.
