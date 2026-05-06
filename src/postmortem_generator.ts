import fs from "node:fs/promises";
import { IncidentReport } from "./types";

function list(items: string[]): string {
  if (items.length === 0) return "- None identified";
  return items.map((item) => `- ${item}`).join("\n");
}

export function renderPostmortem(report: IncidentReport): string {
  const { telemetry, crash, scores, agent } = report;
  return `# Incident Postmortem: ${report.id}

Generated: ${report.generatedAt}
Phase: ${report.phase}

## Executive Summary

${agent.executiveSummary}

## Runtime Context

- Command: \`${telemetry.command} ${telemetry.args.join(" ")}\`
- Scenario: \`${telemetry.scenario}\`
- Exit code: \`${telemetry.exitCode}\`
- Signal: \`${telemetry.signal ?? "none"}\`
- Duration: \`${telemetry.durationMs}ms\`
- Node: \`${telemetry.nodeVersion}\`
- Platform: \`${telemetry.platform}\`

## Root Cause Analysis

${agent.probableRootCause}

Failure class: \`${crash.failureClass}\`
Probable subsystem: \`${crash.probableSubsystem}\`
Parser confidence: \`${Math.round(crash.confidence * 100)}%\`

## Evidence

${list(agent.evidence)}

## Severity Classification

- Severity: \`${scores.severity.severity}\`
- Score: \`${scores.severity.score}/100\`

${list(scores.severity.rationale)}

## Blast Radius

- Score: \`${scores.blastRadius.score}/100\`
- Affected components: ${scores.blastRadius.affectedComponents.join(", ") || "unknown"}
- Affected user paths: ${scores.blastRadius.affectedUserPaths.join(", ") || "unknown"}
- Dependencies: ${scores.blastRadius.dependencies.join(", ") || "none identified"}

Rollback surface:

${list(scores.blastRadius.rollbackSurface)}

## Retry Safety

- Safe to retry: \`${scores.retrySafety.safeToRetry}\`
- Score: \`${scores.retrySafety.score}/100\`

${list(scores.retrySafety.warnings)}

## Regression Guard

- Risk score: \`${scores.regressionGuard.riskScore}/100\`

${list(scores.regressionGuard.warnings)}

## Patch Proposal

${agent.patch.summary}

- Patch risk: \`${agent.patch.riskScore}/100\`
- Patch confidence: \`${Math.round(agent.patch.confidence * 100)}%\`

\`\`\`diff
${agent.patch.unifiedDiff}
\`\`\`

## Rollback Plan

${list(agent.rollbackPlan)}

## Verification Steps

${list(agent.verificationSteps)}

## Residual Risk

${list(agent.residualRisk)}

## Triage Efficiency Score

\`${scores.triageEfficiencyScore}/10000\`

## Raw stderr

\`\`\`
${telemetry.stderr.trim()}
\`\`\`
`;
}

export async function writePostmortem(report: IncidentReport, filePath = "POST_MORTEM.md"): Promise<void> {
  await fs.writeFile(filePath, renderPostmortem(report), "utf8");
}
