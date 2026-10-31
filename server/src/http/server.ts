import express from "express";
import cors from "cors";
import { getCase, MODEL } from "../court/runtime.js";
import { openCase, providerError, raiseObjection } from "../court/court.js";
import { subscribe } from "../court/bus.js";
import { publicCase } from "../court/types.js";

export function createServer() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "64kb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, model: MODEL, live: !!process.env.ANTHROPIC_API_KEY && !providerError, providerError });
  });

  app.post("/api/cases", async (req, res) => {
    const { claim, url, text } = req.body ?? {};
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "The server has no ANTHROPIC_API_KEY configured, so live investigations are unavailable. Use the recorded demo instead." });
    if (url && !/^https?:\/\//.test(url)) return res.status(400).json({ error: "The URL must start with http:// or https://" });
    try {
      const c = await openCase({ claim, url, text });
      res.status(201).json(publicCase(c));
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  app.get("/api/cases/:id", (req, res) => {
    const c = getCase(req.params.id);
    if (!c) return res.status(404).json({ error: "Case not found" });
    res.json(publicCase(c));
  });

  app.get("/api/cases/:id/stream", (req, res) => {
    const c = getCase(req.params.id);
    if (!c) return res.status(404).end();
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
    res.write(`event: case\ndata: ${JSON.stringify(publicCase(c))}\n\n`);
    const unsub = subscribe(c.id, res);
    const ping = setInterval(() => res.write(": ping\n\n"), 15_000);
    req.on("close", () => { clearInterval(ping); unsub(); });
  });

  app.post("/api/cases/:id/objection", async (req, res) => {
    const { argument, url } = req.body ?? {};
    if (!argument || typeof argument !== "string") return res.status(400).json({ error: "State your objection." });
    try {
      const c = await raiseObjection(req.params.id, argument, url);
      res.json(publicCase(c));
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  return app;
}
