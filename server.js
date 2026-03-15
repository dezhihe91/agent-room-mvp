const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const STATES = ["idle", "search", "code", "write", "think"];

let agentCount = 6;
let agents = makeAgents(agentCount);
const clients = new Set();

function makeAgents(count) {
  return Array.from({ length: count }, (_, i) => ({ id: i + 1, state: "idle" }));
}

function randomizeAgents() {
  agents.forEach(agent => {
    agent.state = STATES[Math.floor(Math.random() * STATES.length)];
  });
}

function broadcast() {
  const payload = JSON.stringify({ agents });
  for (const res of clients) {
    res.write(`data: ${payload}\n\n`);
  }
}

setInterval(() => {
  randomizeAgents();
  broadcast();
}, 1600);

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/api/agents") {
    const count = parseInt(url.searchParams.get("count"), 10);
    if (!Number.isNaN(count)) {
      agentCount = Math.max(1, Math.min(24, count));
      agents = makeAgents(agentCount);
      randomizeAgents();
      broadcast();
    }
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
