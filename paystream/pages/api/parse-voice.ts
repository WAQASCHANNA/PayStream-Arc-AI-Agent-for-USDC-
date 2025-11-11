import type { NextApiRequest, NextApiResponse } from "next";
// Use native FormData/Blob provided by the runtime

// We need raw audio bytes, so disable Next.js default body parsing
export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<Buffer> {
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    // Accept either ELEVEN_API_KEY or ELEVENLABS_API_KEY for convenience
    const apiKey = process.env.ELEVEN_API_KEY || process.env.ELEVENLABS_API_KEY;
    const modelId = process.env.ELEVEN_STT_MODEL_ID || "scribe_v1"; // sensible default
    if (!apiKey) return res.status(500).json({ error: "missing ELEVEN_API_KEY" });
    if (!modelId) return res.status(500).json({ error: "missing ELEVEN_STT_MODEL_ID" });

    const audio = await readRawBody(req);
    if (!audio || audio.length === 0) {
      return res.status(400).json({ error: "no audio" });
    }

    // Build multipart/form-data payload per ElevenLabs STT requirements
    const contentTypeHeader = (req.headers["content-type"] as string | undefined) || "";
    const contentType = contentTypeHeader.startsWith("audio/") ? contentTypeHeader : "audio/webm";
    const filename = contentType.includes("wav") ? "audio.wav" : contentType.includes("webm") ? "audio.webm" : "audio.dat";
    const form = new FormData();
    // Build a true ArrayBuffer from the Node Buffer to satisfy DOM Blob typing
    const arrayBuffer = new ArrayBuffer(audio.byteLength);
    const uint8 = new Uint8Array(arrayBuffer);
    uint8.set(audio);
    form.append("file", new Blob([arrayBuffer], { type: contentType }), filename);
    form.append("model_id", modelId);

    const resp = await fetch("https://api.elevenlabs.io/v1/speech-to-text/convert", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
      },
      body: form,
    });

    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(500).json({ error: "STT failed", details: txt });
    }

    const data = await resp.json();
    // Try common fields; fall back to returning entire payload
    const text: string | undefined = (data && (data.text || data.transcript || data.output_text)) as string | undefined;
    return res.status(200).json(text ? { text } : data);
  } catch (err: any) {
    console.error(err);
    const details = err?.message || String(err);
    return res.status(500).json({ error: "server error", details });
  }
}