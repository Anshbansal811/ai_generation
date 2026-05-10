const $ = (sel) => document.querySelector(sel);

const form = $("#genForm");
const promptEl = $("#prompt");
const styleEl = $("#style");
const sizeEl = $("#size");
const statusEl = $("#status");
const resultsEl = $("#results");
const generateBtn = $("#generateBtn");
const randomBtn = $("#randomBtn");
const clearBtn = $("#clearBtn");

const surprisePrompts = [
  "A tiny astronaut watering houseplants inside a glass dome on Mars, soft sunrise, ultra-detailed",
  "A cozy Japanese alleyway in the rain at night, neon reflections, cinematic, 35mm",
  "A majestic dragon made of clouds above a mountain lake, dreamy, volumetric light",
  "A minimalist poster of a black cat with a red scarf, clean vector style, flat colors",
  "A futuristic library carved into a cliff, warm lighting, people reading, wide angle",
  "An antique pocket watch floating in space, stars and dust, macro photography"
];

function setStatus(text, kind = "") {
  statusEl.textContent = text || "";
  statusEl.className = `status ${kind}`.trim();
}

function setBusy(isBusy) {
  generateBtn.classList.toggle("busy", isBusy);
  form.querySelectorAll("textarea,input,select,button").forEach((el) => {
    el.disabled = isBusy && el.id !== "clearBtn";
  });
}

function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function addResultTile({ dataUrl, prompt, size, style }) {
  const tile = document.createElement("div");
  tile.className = "tile";

  const img = document.createElement("img");
  img.src = dataUrl;
  img.alt = prompt;
  img.loading = "lazy";
  img.title = "Click to open full size";
  img.addEventListener("click", () => window.open(dataUrl, "_blank", "noopener,noreferrer"));

  const meta = document.createElement("div");
  meta.className = "meta";

  const left = document.createElement("div");
  left.className = "left";

  const title = document.createElement("div");
  title.className = "title";
  title.textContent = prompt;

  const tag = document.createElement("div");
  tag.className = "tag";
  tag.textContent = `${size}${style ? ` · ${style}` : ""}`;

  left.appendChild(title);
  left.appendChild(tag);

  const right = document.createElement("div");
  right.className = "right";

  const dl = document.createElement("button");
  dl.className = "iconBtn";
  dl.type = "button";
  dl.textContent = "Download";
  dl.addEventListener("click", () => {
    const safe = prompt
      .slice(0, 48)
      .replace(/[^\w\- ]+/g, "")
      .trim()
      .replace(/\s+/g, "_");
    downloadDataUrl(dataUrl, `${safe || "image"}_${size}.png`);
  });

  const copy = document.createElement("button");
  copy.className = "iconBtn";
  copy.type = "button";
  copy.textContent = "Copy prompt";
  copy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(style ? `${prompt}\nStyle: ${style}` : prompt);
      setStatus("Copied prompt to clipboard.", "ok");
      setTimeout(() => setStatus(""), 1400);
    } catch {
      setStatus("Clipboard blocked by browser.", "error");
    }
  });

  right.appendChild(dl);
  right.appendChild(copy);

  meta.appendChild(left);
  meta.appendChild(right);

  tile.appendChild(img);
  tile.appendChild(meta);

  resultsEl.prepend(tile);
}

async function generateImage({ prompt, style, size }) {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, style, size })
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.error || `Request failed (status ${res.status})`;
    const details = json?.details ? `\n${JSON.stringify(json.details)}` : "";
    throw new Error(`${message}${details}`);
  }
  return json;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const prompt = String(promptEl.value || "").trim();
  const style = String(styleEl.value || "").trim();
  const size = String(sizeEl.value || "1024x1024").trim();

  if (!prompt) {
    setStatus("Please enter a prompt.", "error");
    promptEl.focus();
    return;
  }

  setBusy(true);
  setStatus("Generating… (first run may take a few seconds)", "");

  try {
    const out = await generateImage({ prompt, style, size });
    const dataUrl = out?.dataUrl || out?.url;
    if (!dataUrl) throw new Error("No image returned.");
    addResultTile({ dataUrl, prompt, size, style });
    setStatus("Done.", "ok");
    setTimeout(() => setStatus(""), 1200);
  } catch (err) {
    setStatus(err?.message || "Generation failed.", "error");
  } finally {
    setBusy(false);
  }
});

randomBtn.addEventListener("click", () => {
  const pick = surprisePrompts[Math.floor(Math.random() * surprisePrompts.length)];
  promptEl.value = pick;
  promptEl.focus();
  setStatus("Surprise prompt added.", "ok");
  setTimeout(() => setStatus(""), 900);
});

clearBtn.addEventListener("click", () => {
  promptEl.value = "";
  styleEl.value = "";
  setStatus("");
  resultsEl.innerHTML = "";
  promptEl.focus();
});

(async function boot() {
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error("health failed");
    setStatus("Server connected.", "ok");
    setTimeout(() => setStatus(""), 900);
  } catch {
    setStatus(
      "Server not reachable yet. Start it with: cd server; npm i; npm run dev",
      "error"
    );
  }
})();

