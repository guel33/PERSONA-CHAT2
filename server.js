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

// ===== Optional: Basic Auth (einfach & sicher) =====
const BASIC_USER = process.env.BASIC_AUTH_USER;
const BASIC_PASS = process.env.BASIC_AUTH_PASS;

console.log("AUTH USER =", BASIC_USER);
console.log("AUTH PASS =", BASIC_PASS);

app.post("/api/login", (req, res) => {
  const { user, pass } = req.body || {};

  const BASIC_USER = process.env.BASIC_AUTH_USER;
  const BASIC_PASS = process.env.BASIC_AUTH_PASS;

  if (!BASIC_USER || !BASIC_PASS) {
    return res.status(500).json({ error: "BASIC_AUTH_USER/PASS not set" });
  }

  if (user === BASIC_USER && pass === BASIC_PASS) {
    return res.json({ ok: true });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});


if (BASIC_USER && BASIC_PASS) {
  app.use((req, res, next) => {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Basic ")) {
      res.setHeader("WWW-Authenticate", "Basic");
      return res.status(401).send("Authentication required");
    }

    const base64 = auth.split(" ")[1];
    const [user, pass] = Buffer.from(base64, "base64")
      .toString()
      .split(":");

    if (user !== BASIC_USER || pass !== BASIC_PASS) {
      return res.status(403).send("Access denied");
    }

    next();
  });
}

// ===== Static Frontend =====
app.use(express.static(path.join(__dirname, "public")));

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
      return res.status(400).json({ error: "Missing prompt" });
    }

    const model =
      process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

    const msg = await anthropic.messages.create({
      model,
      max_tokens: Number.isFinite(max_tokens) ? max_tokens : 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg?.content?.[0]?.text || "";
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
