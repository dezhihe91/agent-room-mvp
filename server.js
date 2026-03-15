const http = require("http");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const PORT = process.env.PORT || 3000;
const STATES = ["idle", "search", "code", "write", "think"];
const ACTIVE_WINDOW_MIN = parseInt(process.env.ACTIVE_WINDOW_MIN || "10", 10);
const USE_OPENCLAW = process.env.OPENCLAW_MODE !== "off";

let agents = [];
const clients = new Set();

function mapSessionToState(session) {
  // If session updated recently, mark as "code" (active); otherwise idle.
  const active = session.ageMs <= ACTIVE_WINDOW_MIN * 60 * 1000;
  return active ? "code" : "idle";
}

function loadAgentsFromOpenClaw() {
  try {
    const raw = execSync("openclaw sessions --json", { encoding: "utf8" });
    const data = JSON.parse(raw);
    const sessions = data.sessions || [];
    agents = sessions.map((s, idx) => ({
      id: idx + 1,
      name: s.key || `agent-${idx + 1}`,
      state: mapSessionToState(s)
    }));
  } catch (_err) {
    // fallback to random sim if openclaw isn't available
    if (!agents.length) {
      agents = Array.from({ length: 6 }, (_, i) => ({ id: i + 1, state: "idle" }));
    }
    agents.forEach(a => {
      a.state = STATES[Math.floor(Math.random() * STATES.length)];
    });
  }
}

function broadcast() {
  const payload = JSON.stringify({ agents });
  for (const res of clients) {
    res.write(`data: ${payload}\n\n`);
  }
}

setInterval(() => {
  if (USE_OPENCLAW) {
    loadAgentsFromOpenClaw();
  } else {
    agents.forEach(a => (a.state = STATES[Math.floor(Math.random() * STATES.length)]));
  }
  broadcast();
}, 1600);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/agents") {
    if (USE_OPENCLAW) loadAgentsFromOpenClaw();
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ agents }));
    return;
  }

  if (url.pathname === "/api/agents/stream") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ agents })}\n\n`);
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
  const resolvedPath = path.join(__dirname, filePath);
  const ext = path.extname(resolvedPath).toLowerCase();
  const typeMap = {
    ".html": "text/html",
    ".css": "text/css",
    ".js": "text/javascript",
  };

  fs.readFile(resolvedPath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": typeMap[ext] || "text/plain" });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Agent Room MVP running at http://localhost:${PORT}`);
});
