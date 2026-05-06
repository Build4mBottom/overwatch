import { CrashAnalysis, RuntimeTelemetry, SeverityAssessment } from "./types";
import { clamp } from "./utils";

export function classifySeverity(crash: CrashAnalysis, telemetry: RuntimeTelemetry): SeverityAssessment {
  const rationale: string[] = [];
  let score = 25;

  if (telemetry.exitCode && telemetry.exitCode !== 0) {
    score += 20;
    rationale.push(`Process exited non-zero with code ${telemetry.exitCode}.`);
  }
  if (["stateful_dependency_failure", "resource_pressure", "retry_amplification"].includes(crash.failureClass)) {
    score += 25;
    rationale.push(`Failure class ${crash.failureClass} can affect availability beyond one request.`);
  }
  if (["payments", "data-access"].includes(crash.probableSubsystem)) {
    score += 20;
    rationale.push(`Subsystem ${crash.probableSubsystem} is operationally critical.`);
  }
  if (crash.exceptionType.includes("SyntaxError") || crash.failureClass === "payload_parse_failure") {
    score += 8;
    rationale.push("Payload parsing failure is likely request-path contained.");
  }

  score = clamp(score, 1, 100);
  const severity = score >= 85 ? "SEV1" : score >= 65 ? "SEV2" : score >= 35 ? "SEV3" : "SEV4";

  return { severity, score, rationale };
}
