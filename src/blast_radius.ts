import { BlastRadiusAssessment, CrashAnalysis, WorkspaceContext } from "./types";
import { clamp, uniq } from "./utils";

export function estimateBlastRadius(crash: CrashAnalysis, workspace: WorkspaceContext): BlastRadiusAssessment {
  const affectedComponents = uniq([
    crash.probableSubsystem,
    ...crash.failingFiles.map((file) => file.split("/").slice(-1)[0])
  ]).filter(Boolean);

  const dependencies: string[] = [];
  const rationale: string[] = [];
  let score = 20;

  if (crash.failureClass.includes("dependency")) {
    dependencies.push("package resolution");
    score += 20;
  }
  if (crash.failureClass.includes("database") || crash.message.toLowerCase().includes("database")) {
    dependencies.push("database");
    score += 25;
  }
  if (crash.failureClass === "retry_amplification") {
    dependencies.push("upstream service");
    score += 30;
  }
  if (workspace.files.some((file) => file.path.endsWith("/target_app.js"))) {
    rationale.push("Failure is reproducible in the deterministic target service.");
  }

  const affectedUserPaths = crash.probableSubsystem === "payments"
    ? ["payment authorization", "ledger mutation", "settlement ingestion"]
    : ["request ingestion", "worker execution", "operator incident response"];

  const rollbackSurface = crash.failingFiles.length > 0
    ? crash.failingFiles
    : ["last deployment touching runtime entrypoint or configuration"];

  return {
    score: clamp(score + affectedComponents.length * 5, 1, 100),
    affectedComponents,
    affectedUserPaths,
    dependencies: uniq(dependencies),
    rollbackSurface,
    rationale
  };
}
