import { CrashAnalysis, PatchProposal } from "./types";
import { clamp } from "./utils";

function patchForFailure(crash: CrashAnalysis): string {
  if (crash.failureClass === "payload_parse_failure" || crash.failureClass === "api_contract_mismatch") {
    return `diff --git a/target_app.js b/target_app.js
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
   if (!payload.accountId || typeof payload.amountCents !== "number") {
     throw new TypeError("API contract mismatch: accountId and amountCents are required");
   }
   return payload;
 }`;
  }

  if (crash.failureClass === "configuration_failure") {
    return `diff --git a/target_app.js b/target_app.js
--- a/target_app.js
+++ b/target_app.js
@@
-      if (process.env.REQUIRED_REGION !== "us-east-1") {
-        throw new Error("Invalid environment config: REQUIRED_REGION must be us-east-1");
-      }
+      if (process.env.REQUIRED_REGION !== "us-east-1") {
+        throw new Error("Invalid environment config: REQUIRED_REGION must be explicitly set to us-east-1 before boot");
+      }`;
  }

  return `diff --git a/target_app.js b/target_app.js
--- a/target_app.js
+++ b/target_app.js
@@
-main().catch((error) => {
-  console.error(error);
-  process.exitCode = 1;
-});
+main().catch((error) => {
+  console.error(error);
+  process.exitCode = 1;
+});`;
}

export function formatPatchProposal(crash: CrashAnalysis, regressionRisk: number): PatchProposal {
  const confidence = clamp(crash.confidence - regressionRisk / 300, 0.1, 0.92);
  return {
    summary: "Read-only patch proposal generated from deterministic failure evidence.",
    unifiedDiff: patchForFailure(crash),
    riskScore: regressionRisk,
    confidence,
    notes: [
      "Patch is intentionally not applied automatically.",
      "Human review is required before modifying production code.",
      "Validate with deterministic replay and adjacent regression tests."
    ]
  };
}
