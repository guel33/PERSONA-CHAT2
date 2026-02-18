import express from "express";
import dotenv from "dotenv";
import basicAuth from "express-basic-auth";


dotenv.config();

const app = express();

app.use(express.json({ limit: "50kb" }));
app.use(
  basicAuth({
    users: { [process.env.BASIC_AUTH_USER]: process.env.BASIC_AUTH_PASS },
    challenge: true
  })
);
app.use(express.static("public"));

const SYSTEM_PERSONA = `
Du bist eine Lehr-Persona für Studierende. Antworte freundlich, klar und hilfreich.
Erkläre zuerst kurz, gib dann ein kleines Beispiel.
`;

app.post("/api/chat", async (req, res) => {
  try {
    const message = req.body?.message;
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message missing" });
    }

    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest",
        max_tokens: 600,
        system: SYSTEM_PERSONA,
        messages: [{ role: "user", content: message }]
      })
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(resp.status).json({ error: "Claude API error", details: text });
    }

    const data = await resp.json();
    const reply = Array.isArray(data.content)
      ? data.content.filter(x => x.type === "text").map(x => x.text).join("")
      : "";

    res.json({ reply });
  } catch (e) {
    res.status(500).json({ error: "server error", details: String(e) });
  }
});

app.listen(3000, () => {
  console.log("Server läuft auf http://localhost:3000");
});
