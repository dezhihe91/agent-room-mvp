const agentsEl = document.getElementById("agents");
const agentCountInput = document.getElementById("agentCount");
const randomizeBtn = document.getElementById("randomize");
const toggleSimBtn = document.getElementById("toggleSim");
const toggleLiveBtn = document.getElementById("toggleLive");
const liveStatus = document.getElementById("liveStatus");

const STATES = ["idle", "search", "code", "write", "think"];
let simRunning = true;
let simTimer = null;
let liveMode = false;
let eventSource = null;

const ZONES = {
  code: [{ x: 80, y: 270 }, { x: 520, y: 270 }],
  write: [{ x: 280, y: 90 }],
  search: [{ x: 540, y: 90 }],
  think: [{ x: 240, y: 260 }, { x: 360, y: 260 }],
  idle: [
    { x: 90, y: 330 }, { x: 200, y: 350 }, { x: 320, y: 340 },
    { x: 440, y: 350 }, { x: 560, y: 330 }
  ]
};

function pickZone(state, index) {
  const zoneList = ZONES[state] || ZONES.idle;
  return zoneList[index % zoneList.length];
}

function makeAgent(agent, index) {
  const el = document.createElement("div");
  el.className = "agent idle";
  el.dataset.key = agent.key || `agent-${index + 1}`;
  el.dataset.state = "idle";
  el.dataset.x = 120 + (index % 6) * 120;
  el.dataset.y = 320;
  el.style.setProperty("--x", `${el.dataset.x}px`);
  el.style.setProperty("--y", `${el.dataset.y}px`);
  el.innerHTML = `
    <div class="avatar">
      <div class="hat"></div>
      <div class="face"><div class="mouth"></div></div>
      <div class="bubble">Idle</div>
    </div>
    <div class="status">${agent.key || `Agent ${index + 1}`}</div>
  `;
  return el;
}

function renderAgentsFromList(list) {
  agentsEl.innerHTML = "";
  list.forEach((agent, idx) => {
    agentsEl.appendChild(makeAgent(agent, idx));
  });
}

function moveAgent(agentEl, target) {
  const from = {
    x: parseFloat(agentEl.dataset.x || 0),
    y: parseFloat(agentEl.dataset.y || 0)
  };
  const mid = {
    x: (from.x + target.x) / 2,
    y: Math.min(from.y, target.y) - 20
  };

  agentEl.animate(
    [
      { transform: `translate(${from.x}px, ${from.y}px)` },
      { transform: `translate(${mid.x}px, ${mid.y}px)` },
      { transform: `translate(${target.x}px, ${target.y}px)` }
    ],
    { duration: 700, easing: "ease-in-out" }
  );

  agentEl.dataset.x = target.x;
  agentEl.dataset.y = target.y;
  agentEl.style.setProperty("--x", `${target.x}px`);
  agentEl.style.setProperty("--y", `${target.y}px`);
}

function setAgentState(agentEl, state, index = 0) {
  if (agentEl.dataset.state === state) return;
  agentEl.dataset.state = state;
  STATES.forEach(s => agentEl.classList.remove(s));
  agentEl.classList.add(state);
  const bubble = agentEl.querySelector(".bubble");
  bubble.textContent = state.charAt(0).toUpperCase() + state.slice(1);

  const target = pickZone(state, index);
  moveAgent(agentEl, target);
}

function randomizeStates() {
  const agents = agentsEl.querySelectorAll(".agent");
  agents.forEach((agent, idx) => {
    const state = STATES[Math.floor(Math.random() * STATES.length)];
    setAgentState(agent, state, idx);
  });
}

function startSim() {
  if (simTimer) clearInterval(simTimer);
  simTimer = setInterval(randomizeStates, 1600);
  simRunning = true;
  toggleSimBtn.textContent = "Pause";
}

function stopSim() {
  if (simTimer) clearInterval(simTimer);
  simRunning = false;
  toggleSimBtn.textContent = "Resume";
}

function enableLive() {
  liveMode = true;
  liveStatus.classList.add("active");
  stopSim();
  randomizeBtn.disabled = true;
  agentCountInput.disabled = true;
  toggleLiveBtn.textContent = "Stop Live";

  if (eventSource) eventSource.close();
  eventSource = new EventSource("/api/agents/stream");
  eventSource.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (!data?.agents) return;
    if (agentsEl.children.length !== data.agents.length) {
      renderAgentsFromList(data.agents);
    }
    data.agents.forEach((a, idx) => {
      const agentEl = agentsEl.children[idx];
      if (agentEl) setAgentState(agentEl, a.state, idx);
    });
  };
  eventSource.onerror = () => {
    eventSource?.close();
    disableLive();
  };
}

function disableLive() {
  liveMode = false;
  liveStatus.classList.remove("active");
  randomizeBtn.disabled = false;
  agentCountInput.disabled = false;
  toggleLiveBtn.textContent = "Go Live";
  if (eventSource) eventSource.close();
  startSim();
}

randomizeBtn.addEventListener("click", randomizeStates);

toggleSimBtn.addEventListener("click", () => {
  if (!liveMode) {
    simRunning ? stopSim() : startSim();
  }
});

toggleLiveBtn.addEventListener("click", () => {
  liveMode ? disableLive() : enableLive();
});

agentCountInput.addEventListener("change", () => {
  const count = Math.max(1, Math.min(24, parseInt(agentCountInput.value, 10) || 1));
  agentCountInput.value = count;
  renderAgentsFromList(
    Array.from({ length: count }, (_, i) => ({ key: `Agent ${i + 1}` }))
  );
  if (!liveMode) {
    randomizeStates();
  }
});

// Init
renderAgentsFromList(
  Array.from({ length: parseInt(agentCountInput.value, 10) }, (_, i) => ({ key: `Agent ${i + 1}` }))
);
randomizeStates();
startSim();

// Auto-enable live if server is reachable
fetch("/api/agents")
  .then(() => enableLive())
  .catch(() => {});

// Auto-reload on file changes (dev)
try {
  const reloadSource = new EventSource("/api/reload");
  reloadSource.onmessage = () => {
    window.location.reload();
  };
} catch (_) {}
