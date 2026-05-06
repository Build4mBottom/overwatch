# Security Model

## Principle

Incident automation must be safer than the outage it responds to.

## Guarantees

- `.env` is ignored.
- `.env.example` documents configuration without secrets.
- `READ_ONLY_MODE=true` is required.
- Patch proposals are generated as text only.
- No production code is modified automatically.
- File scanning has byte and count limits.
- Generated reports expose confidence and uncertainty.

## Secret Handling

The scanner intentionally includes `.env.example`, not `.env`. Production versions should add redaction for tokens, connection strings, authorization headers, and customer identifiers in logs.

## Why Human Review Is Required

AI can misread stack traces, miss production context, or propose a syntactically valid but operationally unsafe change. During incidents, automated writes can:

- expand blast radius,
- corrupt data,
- hide the original failure,
- and make rollback harder.

Overwatch accelerates triage and proposal generation while preserving human authority.

## Production Hardening Checklist

- Add log redaction.
- Add allowlisted scan roots.
- Add audit logging for generated prompts.
- Add signed postmortem artifacts.
- Add policy checks before patch export.
- Add CI replay before patch approval.
- Add service ownership maps.
