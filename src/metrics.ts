import { IncidentScores } from "./types";
import { clamp } from "./utils";

export function calculateTes(scores: Omit<IncidentScores, "triageEfficiencyScore">): number {
  const baseAutomationValue = 1800;
  const mttrCompression = 2500;
  const contextRecoveryAccuracy = 1200;
  const patchQuality = Math.round(1000 * (1 - scores.regressionGuard.riskScore / 200));
  const operationalSafety = 1200;
  const blastRadiusReduction = Math.round(900 * (scores.blastRadius.score / 100));
  const confidenceReliability = Math.round(950 * (scores.severity.score / 100));
  const humanInterventionCost = 350;
  const regressionRisk = Math.round(scores.regressionGuard.riskScore * 4);
  const falsePositiveRisk = scores.retrySafety.safeToRetry ? 120 : 80;

  return clamp(
    baseAutomationValue +
      mttrCompression +
      contextRecoveryAccuracy +
      patchQuality +
      operationalSafety +
      blastRadiusReduction +
      confidenceReliability -
      humanInterventionCost -
      regressionRisk -
      falsePositiveRisk,
    1,
    10_000
  );
}
