export async function generateImageWithOpenAI({
  apiKey,
  model,
  prompt,
  size,
  n = 1
}) {
  if (!apiKey) {
    const err = new Error("Missing OPENAI_API_KEY");
    err.statusCode = 500;
    throw err;
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      n
    })
  });

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      json?.error?.message ||
      `Image generation failed (status ${res.status})`;
    const err = new Error(message);
    err.statusCode = res.status;
    err.details = json?.error || json;
    throw err;
  }

  const item = json?.data?.[0];
  const b64 = item?.b64_json;
  const url = item?.url;

  if (b64) {
    return { kind: "b64_json", mimeType: "image/png", b64 };
  }
  if (url) {
    return { kind: "url", url };
  }

  const err = new Error("No image returned by provider");
  err.statusCode = 502;
  err.details = json;
  throw err;
}

