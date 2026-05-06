# Benchmark Methodology

## Triage Efficiency Score

Triage Efficiency Score (TES) measures how much operational value the system creates during first-pass incident response.

Range: `1 -> 10,000`

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

## Target Calculation

For the deterministic malformed JSON incident:

```text
Base Automation Value        1,800
MTTR Compression             2,500
Context Recovery Accuracy    1,200
Patch Quality                  825
Operational Safety           1,200
Blast Radius Reduction         630
Confidence Reliability         504
Human Intervention Cost       -350
Regression Risk               -140
False Positive Risk            -80
-----------------------------------
TES                          8,089
```

The architecture target is approximately `9,450 / 10,000` after adding real Cursor execution, CI replay, ownership maps, OpenTelemetry context, and service dependency graphs.

## Why Not Claim 10,000

A perfect score would imply near-zero false positives, fully reliable patch quality, and complete production context. That is not credible. Mature systems expose uncertainty.

## Benchmark vs Default Cursor

| Metric | Default Cursor | Overwatch |
| --- | --- | --- |
| Triggering | Human notices crash | Process watcher |
| Evidence Capture | Manual copy/paste | Structured logs and telemetry |
| Context Recovery | Prompt-dependent | Workspace scanner |
| Failure Parsing | Human reads stack | Stack parser |
| Severity | Usually implicit | Explicit score and label |
| Blast Radius | Manual inference | Structured assessment |
| Retry Safety | Often skipped | Explicit risk model |
| Patch Proposal | Ad hoc | Read-only unified diff |
| Postmortem | Manual | Persistent artifact |
| Repeatability | Weak | Deterministic scenarios |

## Operational Interpretation

TES is not a vanity metric. It forces the system to account for both acceleration and risk. A faster system that produces unsafe patches should score lower than a slower system with better guardrails.
