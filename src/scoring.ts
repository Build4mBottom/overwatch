import { estimateBlastRadius } from "./blast_radius";
import { assessRegressionRisk } from "./regression_guard";
import { assessRetrySafety } from "./retry_safety";
import { classifySeverity } from "./severity_classifier";
import { calculateTes } from "./metrics";
import { CrashAnalysis, IncidentScores, RuntimeTelemetry, WorkspaceContext } from "./types";

export function scoreIncident(crash: CrashAnalysis, telemetry: RuntimeTelemetry, workspace: WorkspaceContext): IncidentScores {
  const severity = classifySeverity(crash, telemetry);
  const blastRadius = estimateBlastRadius(crash, workspace);
  const retrySafety = assessRetrySafety(crash);
  const regressionGuard = assessRegressionRisk(crash, workspace);
  const triageEfficiencyScore = calculateTes({ severity, blastRadius, retrySafety, regressionGuard });
  return { severity, blastRadius, retrySafety, regressionGuard, triageEfficiencyScore };
}
