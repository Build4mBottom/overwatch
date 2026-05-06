export type Severity = "SEV1" | "SEV2" | "SEV3" | "SEV4";

export type FailurePhase =
  | "detected"
  | "captured"
  | "classified"
  | "contextualized"
  | "analyzed"
  | "proposed"
  | "documented";

export interface RuntimeConfig {
  targetCommand: string;
  targetArgs: string[];
  scenario: string;
  cursorAgentCommand?: string;
  maxFileBytes: number;
  maxWorkspaceFiles: number;
  readOnlyMode: boolean;
  dryRun: boolean;
}

export interface RuntimeTelemetry {
  command: string;
  args: string[];
  scenario: string;
  startedAt: string;
  endedAt: string;
  durationMs: number;
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  nodeVersion: string;
  platform: NodeJS.Platform;
  pid?: number;
}

export interface StackFrame {
  raw: string;
  functionName?: string;
  file?: string;
  line?: number;
  column?: number;
  isWorkspaceFrame: boolean;
}

export interface CrashAnalysis {
  exceptionType: string;
  message: string;
  stackFrames: StackFrame[];
  failingFiles: string[];
  probableSubsystem: string;
  failureClass: string;
  runtimeMetadata: Record<string, string | number | boolean | null>;
  confidence: number;
}

export interface WorkspaceFile {
  path: string;
  bytes: number;
  reason: string;
  content: string;
}

export interface WorkspaceContext {
  files: WorkspaceFile[];
  packageSummary?: string;
  scannedAt: string;
}

export interface SeverityAssessment {
  severity: Severity;
  score: number;
  rationale: string[];
}

export interface BlastRadiusAssessment {
  score: number;
  affectedComponents: string[];
  affectedUserPaths: string[];
  dependencies: string[];
  rollbackSurface: string[];
  rationale: string[];
}

export interface RetrySafetyAssessment {
  safeToRetry: boolean;
  score: number;
  warnings: string[];
}

export interface RegressionGuardAssessment {
  riskScore: number;
  warnings: string[];
  verificationSteps: string[];
}

export interface PatchProposal {
  summary: string;
  unifiedDiff: string;
  riskScore: number;
  confidence: number;
  notes: string[];
}

export interface IncidentScores {
  severity: SeverityAssessment;
  blastRadius: BlastRadiusAssessment;
  retrySafety: RetrySafetyAssessment;
  regressionGuard: RegressionGuardAssessment;
  triageEfficiencyScore: number;
}

export interface AgentResult {
  executiveSummary: string;
  probableRootCause: string;
  evidence: string[];
  patch: PatchProposal;
  rollbackPlan: string[];
  verificationSteps: string[];
  residualRisk: string[];
  confidence: number;
}

export interface IncidentReport {
  id: string;
  phase: FailurePhase;
  telemetry: RuntimeTelemetry;
  crash: CrashAnalysis;
  workspace: WorkspaceContext;
  scores: IncidentScores;
  agent: AgentResult;
  generatedAt: string;
}
