const { Worker } = require("node:worker_threads");

const scenario = process.env.SCENARIO || "malformed-json";

function log(message, fields = {}) {
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    level: "info",
    service: "payments-api",
    scenario,
    message,
    ...fields
  }));
}

function parsePayload(raw) {
  const payload = JSON.parse(raw);
  if (!payload.accountId || typeof payload.amountCents !== "number") {
    throw new TypeError("API contract mismatch: accountId and amountCents are required");
  }
  return payload;
}

async function connectDatabase() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Database connection failed: DATABASE_URL is undefined");
  }
  return { url, connected: true };
}

async function retryForever() {
  let attempts = 0;
  while (attempts < 6) {
    attempts += 1;
    log("retry attempt failed", { attempts });
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  throw new Error("Retry storm detected: upstream remained unavailable after bounded replay");
}

async function main() {
  log("target service booting");

  switch (scenario) {
    case "malformed-json":
      parsePayload("{\"accountId\":\"acct_123\", \"amountCents\":");
      break;
    case "async-promise":
      await Promise.reject(new Error("Async promise failure: settlement worker rejected batch"));
      break;
    case "serialization-corruption":
      JSON.stringify({ accountId: "acct_123", self: global });
      break;
    case "invalid-env":
      if (process.env.REQUIRED_REGION !== "us-east-1") {
        throw new Error("Invalid environment config: REQUIRED_REGION must be us-east-1");
      }
      break;
    case "api-contract":
      parsePayload("{\"account\":\"acct_123\",\"amount\":\"42.00\"}");
      break;
    case "dependency-resolution":
      require("@internal/non-existent-ledger-client");
      break;
    case "database-connection":
      await connectDatabase();
      break;
    case "timeout-explosion":
      await new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout explosion: downstream API exceeded 50ms budget")), 50));
      break;
    case "worker-crash":
      await new Promise((resolve, reject) => {
        const worker = new Worker("throw new Error('Worker crash: reconciliation shard failed')", { eval: true });
        worker.on("error", reject);
        worker.on("exit", resolve);
      });
      break;
    case "memory-pressure":
      throw new RangeError("Memory pressure scenario: heap allocation exceeded operational guardrail");
    case "event-loop-starvation": {
      const started = Date.now();
      while (Date.now() - started < 200) {
        Math.sqrt(Math.random());
      }
      throw new Error("Event-loop starvation: synchronous CPU loop blocked request handling");
    }
    case "retry-storm":
      await retryForever();
      break;
    default:
      throw new Error(`Unknown deterministic failure scenario: ${scenario}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
