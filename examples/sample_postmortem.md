# Incident Postmortem: ovw-sample-malformed-json

| Field | Value |
| --- | --- |
| Incident ID | `ovw-sample-malformed-json` |
| Severity | `SEV3` |
| Status | `documented` |
| Subsystem | `request-ingestion` |
| Probable owner | API Platform / Runtime Ingestion |
| Confidence | `83%` |
| Triage Efficiency Score | `7729/10000` |

## Executive Summary

The monitored service crashed in request ingestion due to malformed JSON parsing. First-pass severity is SEV3 because the failure is reproducible and request-path contained, but it still terminates the process.

## Root Cause

`JSON.parse` is called without a local parse guard, allowing malformed input to escape as an uncaught `SyntaxError`.

## Blast Radius

Affected components:

- request ingestion
- payload validation
- process availability for the target service

Rollback risk: `low`

## Patch Proposal

```diff
diff --git a/target_app.js b/target_app.js
--- a/target_app.js
+++ b/target_app.js
@@
-function parsePayload(raw) {
-  const payload = JSON.parse(raw);
+function parsePayload(raw) {
+  let payload;
+  try {
+    payload = JSON.parse(raw);
+  } catch (error) {
+    throw new SyntaxError("Malformed request payload: expected valid JSON");
+  }
```

## Verification

- [ ] Replay `SCENARIO=malformed-json npm run demo`.
- [ ] Add contract tests for invalid JSON and missing required fields.
- [ ] Confirm invalid payloads fail closed without process termination.
