# Architecture Decisions

## ADR 001: Read-Only Patch Generation

Decision: Generate unified diffs but never apply them automatically.

Rationale: Incidents are high-risk moments. A bad autonomous write can expand blast radius. Human approval is a necessary safety boundary.

## ADR 002: Deterministic Demo Failure

Decision: Use `target_app.js` with deterministic failure scenarios.

Rationale: Hiring evaluation should not depend on flaky external systems. Determinism makes the incident loop inspectable and repeatable.

## ADR 003: Local-First Workspace Context

Decision: Scan local files before invoking the AI agent.

Rationale: The model should receive evidence, not vague instructions. Context recovery is the core value.

## ADR 004: Modular Risk Models

Decision: Separate severity, blast radius, retry safety, and regression risk.

Rationale: These are different operational questions. Combining them into one opaque score would reduce trust.

## ADR 005: Cursor-Compatible Agent Boundary

Decision: Use `CURSOR_AGENT_COMMAND` as an external command boundary.

Rationale: The project remains Cursor-native without hard-coding a brittle SDK assumption. It can integrate with local Cursor agent tooling as it evolves.

## ADR 006: No Dashboard In V1

Decision: Ship the incident loop first.

Rationale: A polished dashboard without reliable triage is product theater. The durable artifact is the product.
