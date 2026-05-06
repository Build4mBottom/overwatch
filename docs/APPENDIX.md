# Appendix

## Submission Checklist

- Public GitHub repository: `https://github.com/Build4mBottom/overwatch`
- Primary demo: `npm run demo:offline`
- Live watchdog demo: `npm run start:watchdog`
- Persistent output: `POST_MORTEM.md`
- Cursor-native context: `.cursorrules`
- Optional environment configuration: `.env.example`
- Benchmark methodology: `docs/BENCHMARK.md`
- Loom script: `docs/LOOM_SCRIPT.md`
- One-page summary: `docs/ONE_PAGE_SUMMARY.md`
- Security model: `docs/SECURITY_MODEL.md`

## Terminology

- Incident commander: the role responsible for structuring response, reducing ambiguity, and coordinating recovery.
- MTTR: Mean Time To Recovery.
- RCA: Root Cause Analysis.
- TES: Triage Efficiency Score.
- Read-only patch: a proposed unified diff that is not applied automatically.

## Assumptions

- The first version targets local process crashes because the local loop is deterministic and easy to evaluate.
- Cursor or a Cursor-compatible command can be wired through `CURSOR_AGENT_COMMAND`.
- The project avoids external network dependencies for demo reliability.
- Production integrations should be added only after the safety model is proven.

## Demo Contract

The evaluator should be able to run:

```bash
npm install
npm run demo:offline
```

Expected terminal proof:

```text
[watchdog] replaying deterministic offline crash
[telemetry] stderr captured
[parser] stack trace parsed
[classifier] severity=SEV3
[blast-radius] subsystem=request-ingestion
[output] POST_MORTEM.md generated
```

Expected artifact: `POST_MORTEM.md` with RCA, severity, blast radius, rollback risk, confidence, verification checklist, and read-only patch proposal.

## Extension Points

- Replace local process watcher with Kubernetes pod watcher.
- Add OpenTelemetry span ingestion.
- Add ownership maps from `CODEOWNERS`.
- Add GitHub PR/issue linking.
- Add CI replay after generated patch proposals.

## Non-Goals

- Autonomous production writes.
- Replacing human incident commanders.
- Building a dashboard before the incident loop works.
- Hiding model uncertainty.
