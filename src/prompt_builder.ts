import { CrashAnalysis, IncidentScores, RuntimeTelemetry, WorkspaceContext } from "./types";
import { truncate } from "./utils";

export function buildPrompt(
  telemetry: RuntimeTelemetry,
  crash: CrashAnalysis,
  workspace: WorkspaceContext,
  scores: IncidentScores
): string {
  const files = workspace.files
    .map((file) => `### ${file.path}\nReason: ${file.reason}\n\n\`\`\`\n${truncate(file.content, 12_000)}\n\`\`\``)
    .join("\n\n");

  return `You are acting as a world-class AI-native Forward Deployed Engineer and incident commander inside Cursor.

Mission: compress MTTR by producing operationally safe incident analysis.

Hard constraints:
- Do not modify files.
- Produce a read-only unified diff proposal only.
- Preserve uncertainty.
- Include rollback and verification.
- Treat retries as unsafe unless evidence supports idempotency.

Runtime telemetry:
\`\`\`json
${JSON.stringify(telemetry, null, 2)}
\`\`\`

Parsed crash:
\`\`\`json
${JSON.stringify(crash, null, 2)}
\`\`\`

Preliminary scores:
\`\`\`json
${JSON.stringify(scores, null, 2)}
\`\`\`

Workspace context:
${files}

Return:
1. Executive summary
2. Probable root cause
3. Evidence
4. Severity and blast radius
5. Retry safety
6. Regression warnings
7. Unified diff patch proposal
8. Rollback plan
9. Verification steps
10. Residual risk`;
}
