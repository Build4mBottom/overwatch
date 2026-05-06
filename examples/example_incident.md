# Example Incident

## Input

Backend process crashes during request ingestion.

## Agent Actions

- Detects non-zero process exit.
- Captures runtime logs.
- Parses stack trace.
- Scans workspace context.
- Infers request ingestion ownership.
- Scores severity as SEV3.
- Flags retry as unsafe for deterministic malformed input.
- Generates read-only patch proposal.
- Writes persistent postmortem.

## Output

An operationally actionable incident report in `POST_MORTEM.md`.
