const agentsEl = document.getElementById("agents");
const agentCountInput = document.getElementById("agentCount");
const randomizeBtn = document.getElementById("randomize");
const toggleSimBtn = document.getElementById("toggleSim");

const STATES = ["idle", "search", "code", "write", "think"];
let simRunning = true;
let simTimer = null;
let liveMode = false;
let eventSource = null;

const ZONES = {
  code: [{ x: 70, y: 260 }, { x: 620, y: 260 }],
  write: [{ x: 320, y: 70 }],
  search: [{ x: 640, y: 70 }],
  think: [{ x: 220, y: 260 }],
  idle: [
    { x: 120, y: 320 }, { x: 240, y: 330 }, { x: 360, y: 320 },
    { x: 480, y: 330 }, { x: 600, y: 320 }, { x: 720, y: 330 }
  ]
};

function pickZone(state, index) {
  const zoneList = ZONES[state] || ZONES.idle;
  return zoneList[index % zoneList.length];
}

function makeAgent(id) {
  const el = document.createElement("div");
  el.className = "agent idle";
  el.dataset.x = 120 + (id % 6) * 120;
  el.dataset.y = 320;
  el.style.setProperty("--x", `${el.dataset.x}px`);
  el.style.setProperty("--y", `${el.dataset.y}px`);
  el.innerHTML = `
    <div class="avatar">
      <div class="hat"></div>
      <div class="face"><div class="mouth"></div></div>
      <div class="bubble">Idle</div>
    </div>
    <div class="status">Agent ${id}</div>
  `;
  return el;
}

function renderAgents(count) {
  agentsEl.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    agentsEl.appendChild(makeAgent(i));
  }
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
  toggleSimBtn.textContent = liveMode ? "Live" : "Pause";
}

function stopSim() {
  if (simTimer) clearInterval(simTimer);
  simRunning = false;
  toggleSimBtn.textContent = liveMode ? "Live" : "Resume";
}

function enableLive() {
  liveMode = true;
  stopSim();
  toggleSimBtn.textContent = "Live";
  randomizeBtn.disabled = true;

  if (eventSource) eventSource.close();
  eventSource = new EventSource("/api/agents/stream");
  eventSource.onmessage = (ev) => {
    const data = JSON.parse(ev.data);
    if (!data?.agents) return;
    if (agentsEl.children.length !== data.agents.length) {
      renderAgents(data.agents.length);
    }
    data.agents.forEach((a, idx) => {
      const agentEl = agentsEl.children[idx];
      setAgentState(agentEl, a.state, idx);
    });
  };
  eventSource.onerror = () => {
    eventSource?.close();
    liveMode = false;
    randomizeBtn.disabled = false;
    startSim();
  };
}

function disableLive() {
  liveMode = false;
  randomizeBtn.disabled = false;
  if (eventSource) eventSource.close();
  startSim();
}

randomizeBtn.addEventListener("click", randomizeStates);

toggleSimBtn.addEventListener("click", () => {
  if (liveMode) {
    disableLive();
  } else {
    simRunning ? stopSim() : startSim();
  }
});

agentCountInput.addEventListener("change", () => {
  const count = Math.max(1, Math.min(24, parseInt(agentCountInput.value, 10) || 1));
  agentCountInput.value = count;
  renderAgents(count);
  if (liveMode) {
    fetch(`/api/agents/count/${count}`).catch(() => {});
  } else {
    randomizeStates();
  }
});

// Init
renderAgents(parseInt(agentCountInput.value, 10));
randomizeStates();
startSim();

// Auto-enable live if server is reachable
fetch("/api/agents")
  .then(() => enableLive())
  .catch(() => {});
