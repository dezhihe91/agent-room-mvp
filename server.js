import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATES = ["idle", "search", "code", "write", "think"];
let agentCount = 6;
let agents = Array.from({ length: agentCount }, (_, i) => ({ id: i + 1, state: "idle" }));

function randomState() {
  return STATES[Math.floor(Math.random() * STATES.length)];
}

function tick() {
  agents = agents.map(a => ({ ...a, state: randomState() }));
}

setInterval(tick, 1600);

app.use(express.static(__dirname));

app.get("/api/agents", (_req, res) => {
  res.json({ agents });
});

app.get("/api/agents/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = () => {
    res.write(`data: ${JSON.stringify({ agents })}\n\n`);
  };

  const timer = setInterval(send, 1600);
  send();

  req.on("close", () => {
    clearInterval(timer);
  });
});

app.get("/api/agents/count/:count", (req, res) => {
  const count = Math.max(1, Math.min(24, parseInt(req.params.count, 10) || 1));
  agentCount = count;
  agents = Array.from({ length: agentCount }, (_, i) => ({ id: i + 1, state: randomState() }));
  res.json({ agents });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Agent Room server running on http://localhost:${PORT}`);
});
