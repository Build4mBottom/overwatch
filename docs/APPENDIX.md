# Appendix

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
