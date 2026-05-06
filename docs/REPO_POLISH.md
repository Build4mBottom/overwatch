# Repository Polish Checklist

## GitHub Topics

Add these topics in GitHub repository settings:

- `ai-agents`
- `incident-response`
- `typescript`
- `cursor`
- `developer-tools`
- `reliability-engineering`
- `root-cause-analysis`
- `observability`
- `mttr`
- `fde`
- `ai-native`

## Social Preview

Upload `docs/social-preview.png` as the repository social preview image. The SVG source is also included at `docs/social-preview.svg`.

Suggested copy:

```text
OVERWATCH
AI-Native Autonomous Incident Commander
Reducing production MTTR from 30 minutes to 15 seconds.
```

## Loom Recording

Use `docs/LOOM_SCRIPT.md`.

Demo command:

```bash
npm install
npm run demo:offline
```

The key moment to show is the terminal transition:

```text
[watchdog] replaying deterministic offline crash
[telemetry] stderr captured
[parser] stack trace parsed
[classifier] severity=SEV3
[blast-radius] subsystem=request-ingestion
[analysis] generating incident report
[output] POST_MORTEM.md generated
```
