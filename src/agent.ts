import { spawn } from "node:child_process";
import { CrashAnalysis, AgentResult, IncidentScores } from "./types";
import { formatPatchProposal } from "./patch_formatter";

function runCommand(commandLine: string, input: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const [command, ...args] = commandLine.split(" ").filter(Boolean);
    const child = spawn(command, args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(`Cursor agent command exited ${code}: ${stderr}`));
    });
    child.stdin.end(input);
  });
}

function deterministicAnalysis(crash: CrashAnalysis, scores: IncidentScores): AgentResult {
  const patch = formatPatchProposal(crash, scores.regressionGuard.riskScore);
  return {
    executiveSummary: `The monitored service crashed in subsystem ${crash.probableSubsystem} due to ${crash.failureClass}. First-pass severity is ${scores.severity.severity}.`,
    probableRootCause: `${crash.exceptionType}: ${crash.message}`,
    evidence: [
      `Exception type: ${crash.exceptionType}`,
      `Failure class: ${crash.failureClass}`,
      `Failing files: ${crash.failingFiles.join(", ") || "none resolved"}`,
      `Parser confidence: ${Math.round(crash.confidence * 100)}%`
    ],
    patch,
    rollbackPlan: [
      "Do not apply patch automatically.",
      "If this appeared after a deployment, roll back the last change touching the failing subsystem.",
      "If rollback is unavailable, gate the affected path and fail closed with a typed operational error."
    ],
    verificationSteps: scores.regressionGuard.verificationSteps,
    residualRisk: [
      "Local deterministic reproduction does not prove production dependency health.",
      "Patch confidence depends on stack trace completeness.",
      "Adjacent contract tests should be added before release."
    ],
    confidence: patch.confidence
  };
}

export async function invokeAgent(
  prompt: string,
  crash: CrashAnalysis,
  scores: IncidentScores,
  cursorAgentCommand?: string
): Promise<AgentResult> {
  if (!cursorAgentCommand) {
    return deterministicAnalysis(crash, scores);
  }

  const output = await runCommand(cursorAgentCommand, prompt);
  const patch = formatPatchProposal(crash, scores.regressionGuard.riskScore);
  return {
    ...deterministicAnalysis(crash, scores),
    executiveSummary: output.trim().slice(0, 4000) || deterministicAnalysis(crash, scores).executiveSummary,
    patch
  };
}
