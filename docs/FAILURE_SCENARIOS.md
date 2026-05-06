# Failure Scenarios

Project Overwatch includes deterministic scenarios that feel like real backend failures.

| Scenario | Failure Class | Operational Meaning |
| --- | --- | --- |
| `malformed-json` | payload parse failure | Bad request payload crashes parser path |
| `async-promise` | runtime exception | Async worker rejects without local recovery |
| `serialization-corruption` | runtime exception | Object serialization fails unexpectedly |
| `invalid-env` | configuration failure | Required environment is missing or wrong |
| `api-contract` | API contract mismatch | Caller sends incompatible shape |
| `dependency-resolution` | dependency resolution failure | Runtime package is missing |
| `database-connection` | stateful dependency failure | Required database URL is unavailable |
| `timeout-explosion` | latency budget exhaustion | Downstream exceeds operational budget |
| `worker-crash` | worker isolation failure | Background worker fails outside main path |
| `memory-pressure` | resource pressure | Runtime exceeds memory guardrail |
| `event-loop-starvation` | runtime exception | CPU loop blocks request handling |
| `retry-storm` | retry amplification | Retries become part of the incident |

Run:

```bash
SCENARIO=retry-storm npm run demo
```

Each scenario should produce a postmortem with the same artifact shape, allowing repeatable evaluation.
