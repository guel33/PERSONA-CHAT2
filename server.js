import dotenv from "dotenv";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

dotenv.config();

const app = express();
app.use(express.json());

// ===== ES Module __dirname Fix =====
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== Static Frontend =====
// Stelle sicher: public/index.html existiert!
app.use(express.static(path.join(__dirname, "public")));

// ===== LOGIN (Prompt-Login) =====
app.post("/api/login", (req, res) => {
  const { user, pass } = req.body || {};

  const expectedUser = process.env.APP_USER;
  const expectedPass = process.env.APP_PASS;

  if (!expectedUser || !expectedPass) {
    return res.status(500).json({ error: "APP_USER/APP_PASS not set" });
  }

  if (user === expectedUser && pass === expectedPass) {
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: "invalid credentials" });
});

// ===== Claude Client =====
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("⚠️ ANTHROPIC_API_KEY is not set");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ===== API: Frontend → Backend → Claude =====
app.post("/api/chat", async (req, res) => {
  try {
    const { prompt, max_tokens } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Missing prompt (string)" });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: "ANTHROPIC_API_KEY is not set" });
    }

    const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    const msg = await anthropic.messages.create({
      model,
      max_tokens: Number.isFinite(max_tokens) ? max_tokens : 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg?.content?.[0]?.text ?? "";
    res.json({ text });
  } catch (err) {
    console.error("Claude error:", err);
    res.status(500).json({ error: "Claude request failed" });
  }
});

// ===== Start Server =====
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ Server läuft auf http://localhost:${port}`);
});