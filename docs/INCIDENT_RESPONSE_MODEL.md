# Incident Response Model

## Lifecycle

```text
detected -> captured -> classified -> contextualized -> analyzed -> proposed -> documented
```

## Detected

The monitored process exits non-zero or receives a fatal signal.

## Captured

Overwatch stores stdout, stderr, exit code, signal, timestamps, command, args, runtime version, and platform.

## Classified

The crash parser extracts exception metadata and maps it to a failure class.

## Contextualized

The workspace scanner reads related files with strict limits.

## Analyzed

Severity, blast radius, retry safety, regression risk, and confidence are scored.

## Proposed

A read-only patch proposal, rollback plan, and verification checklist are generated.

## Documented

The full incident report is persisted to `POST_MORTEM.md`.

## Human Role

The human remains responsible for approval, deployment, and final incident judgment. Overwatch removes toil from the hot path.
