const terminal = document.querySelector("#terminal");
const postmortem = document.querySelector("#postmortem");
const commandLabel = document.querySelector("#command-label");
const buttons = [...document.querySelectorAll("button")];

const dots = {
  monitoring: document.querySelector("#dot-monitoring"),
  incident: document.querySelector("#dot-incident"),
  rca: document.querySelector("#dot-rca")
};

const fields = {
  incidentId: document.querySelector("#incident-id"),
  severity: document.querySelector("#severity"),
  exception: document.querySelector("#exception"),
  subsystem: document.querySelector("#subsystem"),
  blastRadius: document.querySelector("#blast-radius"),
  mttr: document.querySelector("#mttr"),
  confidence: document.querySelector("#confidence"),
  rca: document.querySelector("#rca"),
  patch: document.querySelector("#patch"),
  checklist: document.querySelector("#checklist")
};

function setButtons(disabled) {
  buttons.forEach((button) => {
    button.disabled = disabled;
  });
}

function resetDots() {
  Object.values(dots).forEach((dot) => {
    dot.className = "dot";
  });
}

function activate(dot) {
  dot.classList.add("active");
}

function append(text) {
  terminal.textContent += text;
  terminal.scrollTop = terminal.scrollHeight;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSummary(summary = {}) {
  fields.incidentId.textContent = summary.incidentId || "pending";
  fields.severity.textContent = summary.severity || "pending";
  fields.exception.textContent = summary.exception || "pending";
  fields.subsystem.textContent = summary.subsystem || "pending";
  fields.blastRadius.textContent = summary.blastRadius || "pending";
  fields.mttr.textContent = summary.mttrEstimate || "pending";
  fields.confidence.textContent = summary.confidence || "pending";
  fields.rca.textContent = summary.rootCause || "Run a demo to generate RCA.";
  fields.patch.textContent = summary.patch || "Run a demo to generate a patch proposal.";

  const items = summary.checklist?.length ? summary.checklist : [
    "Restart service",
    "Validate payload parser",
    "Run integration tests",
    "Confirm no retry storm"
  ];
  fields.checklist.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderPostmortem(payload = {}) {
  postmortem.textContent = payload.postmortem || "";
  renderSummary(payload.summary || {});
}

async function refreshPostmortem() {
  const response = await fetch("/api/postmortem");
  if (!response.ok) return;
  renderPostmortem(await response.json());
}

function handleLogText(text) {
  append(text);
  if (text.includes("[watchdog]")) activate(dots.monitoring);
  if (text.includes("[incident]") || text.includes("stderr captured")) activate(dots.incident);
  if (text.includes("[output] POST_MORTEM.md generated")) activate(dots.rca);
}

async function runDemo(kind) {
  resetDots();
  setButtons(true);
  const label = kind === "offline" ? "npm run demo:offline" : "npm run start:watchdog";
  commandLabel.textContent = label;
  terminal.textContent = `[dashboard] executing ${label}\n`;
  activate(dots.monitoring);

  try {
    const response = await fetch(`/api/stream/${kind}`);
    if (!response.ok || !response.body) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || `Command failed with HTTP ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.trim()) continue;
        const event = JSON.parse(line);
        if (event.type === "stdout" || event.type === "stderr") {
          handleLogText(event.text);
        }
        if (event.type === "exit") {
          append(`\n[dashboard] exitCode=${event.exitCode}\n`);
        }
        if (event.type === "postmortem") {
          renderPostmortem(event);
          activate(dots.rca);
        }
        if (event.type === "error") {
          append(`\n[dashboard] ${event.text}\n`);
        }
      }
    }
  } catch (error) {
    append(`\n[dashboard] ${error instanceof Error ? error.message : String(error)}\n`);
    dots.incident.classList.add("failed");
  } finally {
    setButtons(false);
  }
}

document.querySelector("#run-offline").addEventListener("click", () => runDemo("offline"));
document.querySelector("#run-watchdog").addEventListener("click", () => runDemo("watchdog"));

refreshPostmortem().catch(() => undefined);
