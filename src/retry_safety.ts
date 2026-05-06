import { CrashAnalysis, RetrySafetyAssessment } from "./types";

export function assessRetrySafety(crash: CrashAnalysis): RetrySafetyAssessment {
  const warnings: string[] = [];
  let safeToRetry = true;
  let score = 80;

  if (["payload_parse_failure", "api_contract_mismatch", "configuration_failure"].includes(crash.failureClass)) {
    safeToRetry = false;
    score = 25;
    warnings.push("Retrying deterministic input or invalid configuration will reproduce the same failure.");
  }
  if (crash.failureClass === "retry_amplification") {
    safeToRetry = false;
    score = 5;
    warnings.push("Retry path is itself part of the incident and may amplify load.");
  }
  if (crash.failureClass === "stateful_dependency_failure") {
    score = 45;
    warnings.push("Retry only after dependency health is confirmed and idempotency is verified.");
  }

  return { safeToRetry, score, warnings };
}
