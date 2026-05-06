# Overwatch One-Page Summary

## What It Is

Overwatch is an AI-native autonomous incident commander for backend/runtime crashes. It monitors a process, captures crash evidence, reconstructs local context, scores operational risk, proposes a safe patch, and writes a durable postmortem.

## Why It Matters

Modern AI tools make code generation cheap. Production reliability remains expensive because incidents require fast judgment under incomplete information. Overwatch focuses AI on the highest-leverage operational bottleneck: context recovery during failure.

## Input

A backend process crashes.

## Local Proof Command

```bash
npm install
npm run demo:offline
```

Optional live watchdog path:

```bash
npm run start:watchdog
```

## Autonomous Agent Path

1. Detects process failure.
2. Captures stdout, stderr, exit code, timestamps, Node version, platform, and scenario metadata.
3. Parses stack traces for exception type, failing frames, files, and failure class.
4. Scans related workspace files.
5. Infers probable subsystem and ownership.
6. Scores severity, blast radius, retry safety, regression risk, and confidence.
7. Builds a Cursor-native operational prompt.
8. Invokes a Cursor-compatible agent command or deterministic local analyzer.
9. Generates RCA, rollback guidance, verification steps, and read-only patch proposal.
10. Persists `POST_MORTEM.md`.

## Output

An operationally actionable incident report with:

- executive summary,
- probable root cause,
- evidence,
- severity classification,
- blast radius,
- retry safety,
- regression warnings,
- unified diff patch proposal,
- rollback plan,
- verification steps,
- residual risk,
- and Triage Efficiency Score.

## Safety Posture

Overwatch never auto-modifies production code. It generates patches as proposals and requires human review. This is intentional: autonomous hot-path writes can amplify incident damage.

## Strategic Signal

This project demonstrates priority definition ability. It chooses downtime reduction and operational decision quality over shallow AI demo spectacle.

## Quest Fit

- Public repo package: README, working TypeScript source, `.cursorrules`, `.env.example`, benchmark docs, Loom script, one-page summary, and appendix.
- Demo proof: crash evidence becomes RCA, blast radius, severity, patch proposal, and `POST_MORTEM.md`.
- Safety proof: no API key is required for offline demo; full AI/Cursor mode is optional.
