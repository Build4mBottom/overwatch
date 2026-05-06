import { CrashAnalysis, RegressionGuardAssessment, WorkspaceContext } from "./types";
import { clamp } from "./utils";

export function assessRegressionRisk(crash: CrashAnalysis, workspace: WorkspaceContext): RegressionGuardAssessment {
  const warnings: string[] = [];
  const verificationSteps = [
    `Replay deterministic scenario: SCENARIO=${crash.runtimeMetadata.scenario} npm run demo`,
    "Run TypeScript build: npm run build",
    "Inspect generated unified diff before applying any change"
  ];

  let riskScore = 35;

  if (crash.probableSubsystem === "payments" || crash.probableSubsystem === "data-access") {
    riskScore += 25;
    warnings.push("Critical subsystem requires stronger integration coverage before deployment.");
  }
  if (workspace.files.length < 3) {
    riskScore += 15;
    warnings.push("Limited workspace context lowers patch confidence.");
  }
  if (crash.failureClass === "serialization_corruption" || crash.failureClass === "resource_pressure") {
    riskScore += 10;
    warnings.push("Runtime/resource failures can hide secondary effects.");
  }

  return {
    riskScore: clamp(riskScore, 1, 100),
    warnings,
    verificationSteps
  };
}
