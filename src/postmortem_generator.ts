import fs from "node:fs/promises";
import { IncidentReport } from "./types";

function list(items: string[]): string {
  if (items.length === 0) return "- None identified";
  return items.map((item) => `- ${item}`).join("\n");
}

function checkboxes(items: string[]): string {
  if (items.length === 0) return "- [ ] No verification steps generated";
  return items.map((item) => `- [ ] ${item}`).join("\n");
}

function ownerForSubsystem(subsystem: string): string {
  const owners: Record<string, string> = {
    "request-ingestion": "API Platform / Runtime Ingestion",
    payments: "Payments Platform",
    workers: "Background Jobs",
    "data-access": "Data Platform",
    configuration: "Infrastructure / Runtime Configuration"
  };
  return owners[subsystem] || "Runtime Platform";
}

export function renderPostmortem(report: IncidentReport): string {
  const { telemetry, crash, scores, agent } = report;
  return `# Incident Postmortem: ${report.id}

| Field | Value |
| --- | --- |
| Incident ID | \`${report.id}\` |
| Severity | \`${scores.severity.severity}\` |
| Status | \`${report.phase}\` |
| Generated | \`${report.generatedAt}\` |
| Started | \`${telemetry.startedAt}\` |
| Ended | \`${telemetry.endedAt}\` |
| Duration | \`${telemetry.durationMs}ms\` |
| Subsystem | \`${crash.probableSubsystem}\` |
| Probable owner | ${ownerForSubsystem(crash.probableSubsystem)} |
| Confidence | \`${Math.round(agent.confidence * 100)}%\` |
| Triage Efficiency Score | \`${scores.triageEfficiencyScore}/10000\` |

## Executive Summary

${agent.executiveSummary}

## Incident Timeline

| Time | Event |
| --- | --- |
| \`${telemetry.startedAt}\` | Watchdog launched monitored process |
| \`${telemetry.endedAt}\` | Process exited unexpectedly with code \`${telemetry.exitCode}\` |
| \`${report.generatedAt}\` | Overwatch generated persistent incident report |

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

| Signal | Value |
| --- | --- |
| Exception | \`${crash.exceptionType}\` |
| Failure class | \`${crash.failureClass}\` |
| Probable subsystem | \`${crash.probableSubsystem}\` |
| Probable owner | ${ownerForSubsystem(crash.probableSubsystem)} |
| Parser confidence | \`${Math.round(crash.confidence * 100)}%\` |

## Evidence

${list(agent.evidence)}

## Severity Classification

| Metric | Value |
| --- | --- |
| Severity | \`${scores.severity.severity}\` |
| Score | \`${scores.severity.score}/100\` |
| Confidence | \`${Math.round(agent.confidence * 100)}%\` |

${list(scores.severity.rationale)}

## Blast Radius

| Dimension | Assessment |
| --- | --- |
| Score | \`${scores.blastRadius.score}/100\` |
| Affected components | ${scores.blastRadius.affectedComponents.join(", ") || "unknown"} |
| Affected user paths | ${scores.blastRadius.affectedUserPaths.join(", ") || "unknown"} |
| Dependencies | ${scores.blastRadius.dependencies.join(", ") || "none identified"} |
| Rollback risk | \`${agent.patch.riskScore >= 70 ? "high" : agent.patch.riskScore >= 40 ? "medium" : "low"}\` |

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

| Patch Signal | Value |
| --- | --- |
| Patch risk | \`${agent.patch.riskScore}/100\` |
| Patch confidence | \`${Math.round(agent.patch.confidence * 100)}%\` |
| Safety mode | Read-only proposal, human review required |

\`\`\`diff
${agent.patch.unifiedDiff}
\`\`\`

## Rollback Plan

${list(agent.rollbackPlan)}

## Verification Steps

${checkboxes(agent.verificationSteps)}

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
