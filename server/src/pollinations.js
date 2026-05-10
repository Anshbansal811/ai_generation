export async function generateImageWithPollinations({ prompt, width, height }) {
  const encoded = encodeURIComponent(prompt);
  const url = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(
    Math.random() * 1_000_000
  )}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "image/*"
    }
  });

  if (!res.ok) {
    const err = new Error(`Free image provider failed (status ${res.status})`);
    err.statusCode = res.status;
    throw err;
  }

  const mimeType = res.headers.get("content-type") || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  const b64 = buf.toString("base64");
  return {
    kind: "b64",
    mimeType,
    b64
  };
}

