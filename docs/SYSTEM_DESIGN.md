# System Design

## Design Goal

Project Overwatch is designed as a narrow, reliable incident loop:

```text
process crash -> evidence capture -> context recovery -> risk scoring -> AI analysis -> postmortem
```

## Components

### `runner.ts`

Owns process lifecycle. It launches the target process with `child_process.spawn`, streams stdout/stderr, records timestamps, writes `crash.log`, and orchestrates analysis after non-zero exit.

### `crash_parser.ts`

Extracts exception type, message, stack frames, failing files, failure class, probable subsystem, and parser confidence.

### `workspace_scanner.ts`

Scans directly related files and limited operational context. It uses file count and byte limits to reduce accidental over-collection.

### `severity_classifier.ts`

Converts failure evidence into a severity label and score.

### `blast_radius.ts`

Estimates affected components, user paths, dependencies, and rollback surface.

### `retry_safety.ts`

Determines whether retry is likely safe or likely to amplify the incident.

### `regression_guard.ts`

Flags patch risk and required verification.

### `prompt_builder.ts`

Builds a Cursor-native operational prompt with logs, source context, scores, and hard safety constraints.

### `agent.ts`

Invokes `CURSOR_AGENT_COMMAND` when configured. Falls back to deterministic local analysis for reliable demos.

### `postmortem_generator.ts`

Renders `POST_MORTEM.md` with the complete incident record.

## Data Flow

All modules exchange typed interfaces from `types.ts`. This keeps the system composable and makes future integrations straightforward.

## Failure Handling

Overwatch separates monitored-process failure from Overwatch runtime failure. If the target crashes, Overwatch continues. If Overwatch fails, it emits structured logs and exits non-zero.

## Why No UI

The first product loop is operational value, not presentation. A dashboard can come later, once the incident artifact and automation loop are proven.
