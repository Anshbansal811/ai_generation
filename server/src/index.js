import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateImageWithOpenAI } from "./openai.js";
import { generateImageWithPollinations } from "./pollinations.js";

const app = express();
app.disable("x-powered-by");

app.use(express.json({ limit: "1mb" }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const webDir = path.resolve(__dirname, "..", "..", "web");

app.use(express.static(webDir));

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get("/api/debug", (req, res) => {
  const key = String(process.env.OPENAI_API_KEY || "");
  const trimmed = key.trim();
  const prefix = trimmed ? `${trimmed.slice(0, 7)}…${trimmed.slice(-4)}` : "";

  res.json({
    hasKey: Boolean(trimmed),
    looksLikePlaceholder: trimmed.includes("your_api_key_here"),
    keyPrefix: prefix,
    model: process.env.OPENAI_IMAGES_MODEL || "gpt-image-1",
    provider: (process.env.IMAGE_PROVIDER || "openai").toLowerCase()
  });
});

app.post("/api/generate", async (req, res) => {
  const prompt = String(req.body?.prompt ?? "").trim();
  const size = String(req.body?.size ?? "1024x1024");
  const style = String(req.body?.style ?? "").trim();

  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required." });
  }

  const allowedSizes = new Set(["512x512", "1024x1024", "1024x1536", "1536x1024"]);
  if (!allowedSizes.has(size)) {
    return res.status(400).json({ error: "Invalid size." });
  }

  const finalPrompt = style ? `${prompt}\n\nStyle: ${style}` : prompt;

  try {
    const provider = (process.env.IMAGE_PROVIDER || "openai").toLowerCase();
    let result;

    if (provider === "pollinations") {
      const [w, h] = size.split("x").map((v) => Number(v));
      const out = await generateImageWithPollinations({
        prompt: finalPrompt,
        width: w,
        height: h
      });
      result = {
        kind: "dataUrl",
        mimeType: out.mimeType,
        dataUrl: `data:${out.mimeType};base64,${out.b64}`
      };
    } else {
      const model = process.env.OPENAI_IMAGES_MODEL || "gpt-image-1";
      const out = await generateImageWithOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model,
        prompt: finalPrompt,
        size
      });

      if (out.kind === "b64_json") {
        result = {
          kind: "dataUrl",
          mimeType: out.mimeType,
          dataUrl: `data:${out.mimeType};base64,${out.b64}`
        };
      } else if (out.kind === "url") {
        result = { kind: "url", url: out.url };
      }
    }

    if (result?.kind === "dataUrl") return res.json(result);
    if (result?.kind === "url") return res.json(result);

    return res.status(502).json({ error: "Unsupported image response." });
  } catch (e) {
    const statusCode = Number(e?.statusCode) || 500;
    res.status(statusCode).json({
      error: e?.message || "Generation failed.",
      details: e?.details
    });
  }
});

const port = Number(process.env.PORT) || 5179;
app.listen(port, () => {
  console.log(`AI Image App running on http://localhost:${port}`);
});

