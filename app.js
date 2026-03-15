const agentsEl = document.getElementById("agents");
const agentCountInput = document.getElementById("agentCount");
const randomizeBtn = document.getElementById("randomize");
const toggleSimBtn = document.getElementById("toggleSim");

const STATES = ["idle", "search", "code", "write", "think"];
let simRunning = true;
let simTimer = null;

function makeAgent(id) {
  const el = document.createElement("div");
  el.className = "agent idle";
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

function setAgentState(agentEl, state) {
  STATES.forEach(s => agentEl.classList.remove(s));
  agentEl.classList.add(state);
  const bubble = agentEl.querySelector(".bubble");
  bubble.textContent = state.charAt(0).toUpperCase() + state.slice(1);
}

function randomizeStates() {
  const agents = agentsEl.querySelectorAll(".agent");
  agents.forEach(agent => {
    const state = STATES[Math.floor(Math.random() * STATES.length)];
    setAgentState(agent, state);
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

randomizeBtn.addEventListener("click", randomizeStates);

toggleSimBtn.addEventListener("click", () => {
  simRunning ? stopSim() : startSim();
});

agentCountInput.addEventListener("change", () => {
  const count = Math.max(1, Math.min(24, parseInt(agentCountInput.value, 10) || 1));
  agentCountInput.value = count;
  renderAgents(count);
  randomizeStates();
});

// Init
renderAgents(parseInt(agentCountInput.value, 10));
randomizeStates();
startSim();
