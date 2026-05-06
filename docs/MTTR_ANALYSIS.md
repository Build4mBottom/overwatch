# MTTR Analysis

## Baseline

Manual incident triage with Cursor commonly includes:

| Step | Estimated Time |
| --- | ---: |
| Notice crash | 1-3 min |
| Copy logs | 1 min |
| Parse stack trace | 2-5 min |
| Open relevant files | 3-8 min |
| Reconstruct context | 5-10 min |
| Ask AI for analysis | 2-5 min |
| Draft incident notes | 10+ min |

Approximate first-pass triage: `30 minutes`.

## Overwatch Path

| Step | Estimated Time |
| --- | ---: |
| Detect crash | immediate |
| Capture logs | immediate |
| Parse stack trace | milliseconds |
| Scan workspace | milliseconds to seconds |
| Score risk | milliseconds |
| Generate postmortem | seconds |

Approximate first-pass triage: `15 seconds`.

## Compression

```text
30 minutes -> 15 seconds
1800 seconds -> 15 seconds
120x first-pass triage compression
```

## Important Caveat

Overwatch compresses first-pass triage, not full production recovery. Recovery still requires human approval, verification, and deployment safety.
