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

const systemFields = {
  build: document.querySelector("#sys-build"),
  command: document.querySelector("#sys-command"),
  incident: document.querySelector("#sys-incident"),
  severity: document.querySelector("#sys-severity"),
  generated: document.querySelector("#sys-generated"),
  mode: document.querySelector("#sys-mode")
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

function badge(pass) {
  return `<span class="badge ${pass ? "pass" : "fail"}">${pass ? "PASS" : "FAIL"}</span>`;
}

function checkList(checks = []) {
  return `<div class="check-list">${checks.map((check) => `
    <div class="check-row">
      ${badge(Boolean(check.pass))}
      <span>${escapeHtml(check.label)}</span>
      ${check.path ? `<code>${escapeHtml(check.path)}</code>` : ""}
      ${check.detail ? `<small>${escapeHtml(check.detail)}</small>` : ""}
    </div>
  `).join("")}</div>`;
}

function sourceBlock(label, content) {
  return `<div class="source-block">
    <div class="source-label">${escapeHtml(label)}</div>
    <pre>${escapeHtml(content || "No excerpt available.")}</pre>
  </div>`;
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

function renderSystemStatus(status = {}) {
  systemFields.build.textContent = status.buildStatus || "pending";
  systemFields.command.textContent = status.lastDemoCommand || "pending";
  systemFields.incident.textContent = status.lastIncidentId || "pending";
  systemFields.severity.textContent = status.lastSeverity || "pending";
  systemFields.generated.textContent = status.postmortemGeneratedAt || "pending";
  systemFields.mode.textContent = status.dashboardMode || "localhost only";
}

async function refreshPostmortem() {
  const response = await fetch("/api/postmortem");
  if (!response.ok) return;
  renderPostmortem(await response.json());
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}`);
  }
  return response.json();
}

async function refreshEvidence() {
  const [system, cursor, security, architecture, quest, benchmark] = await Promise.all([
    fetchJson("/api/system-checks"),
    fetchJson("/api/cursor-config"),
    fetchJson("/api/security-checks"),
    fetchJson("/api/architecture"),
    fetchJson("/api/quest-checklist"),
    fetchJson("/api/benchmark-evidence")
  ]);

  renderSystemStatus(system);
  renderCursorConfig(cursor);
  renderSecurityChecks(security);
  renderArchitecture(architecture);
  renderQuestChecklist(quest);
  renderBenchmark(benchmark);
}

function renderCursorConfig(payload = {}) {
  document.querySelector("#cursor-config").innerHTML = `
    <div class="mode-line"><span>analysis mode</span><strong>${escapeHtml(payload.analysisMode || "pending")}</strong></div>
    ${checkList(payload.checks)}
    ${sourceBlock(".cursorrules first 20 lines", payload.excerpt)}
  `;
}

function renderSecurityChecks(payload = {}) {
  document.querySelector("#security-checks").innerHTML = checkList(payload.checks);
}

function renderArchitecture(payload = {}) {
  document.querySelector("#architecture-flow").innerHTML = (payload.nodes || []).map((node, index) => `
    <details class="arch-node">
      <summary>
        ${badge(Boolean(node.pass))}
        <code>${escapeHtml(node.file)}</code>
        <span>${escapeHtml(node.role)}</span>
      </summary>
      ${sourceBlock(`${node.file} excerpt`, node.excerpt)}
    </details>
    ${index < (payload.nodes || []).length - 1 ? `<div class="connector">-></div>` : ""}
  `).join("");
}

function renderQuestChecklist(payload = {}) {
  document.querySelector("#quest-checklist").innerHTML = checkList(payload.checks);
}

function renderBenchmark(payload = {}) {
  document.querySelector("#benchmark-evidence").innerHTML = `
    <div class="benchmark-strip">
      <div><span>Triage Efficiency Score</span><strong>${escapeHtml(payload.triageEfficiencyScore || "pending")}</strong></div>
      <div><span>Benchmark Doc</span><strong>${badge(Boolean(payload.benchmarkExists))} <code>${escapeHtml(payload.benchmarkPath || "docs/BENCHMARK.md")}</code></strong></div>
    </div>
    ${sourceBlock("docs/BENCHMARK.md calculation excerpt", payload.excerpt)}
  `;

  document.querySelector("#benchmark-table").innerHTML = `
    <thead>
      <tr><th>Metric</th><th>Default Cursor Workflow</th><th>Project Overwatch</th></tr>
    </thead>
    <tbody>
      ${(payload.comparison || []).map((row) => `
        <tr><td>${escapeHtml(row[0])}</td><td>${escapeHtml(row[1])}</td><td>${escapeHtml(row[2])}</td></tr>
      `).join("")}
    </tbody>
  `;
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
          refreshEvidence().catch((refreshError) => append(`\n[dashboard] evidence refresh failed: ${refreshError.message}\n`));
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

Promise.all([
  refreshPostmortem(),
  refreshEvidence()
]).catch((error) => {
  append(`\n[dashboard] ${error instanceof Error ? error.message : String(error)}\n`);
});
