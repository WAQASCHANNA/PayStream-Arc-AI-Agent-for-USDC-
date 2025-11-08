import type { NextApiRequest, NextApiResponse } from "next";
import FormData from "form-data";

export const config = { api: { bodyParser: false } };

async function bufferFromReq(req: NextApiRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const ELEVEN = process.env.ELEVEN_API_KEY;
    if (!ELEVEN) return res.status(500).json({ error: "missing ELEVEN_API_KEY" });
    const MODEL_ID = process.env.ELEVEN_STT_MODEL_ID;
    if (!MODEL_ID) return res.status(500).json({ error: "missing ELEVEN_STT_MODEL_ID" });

    const raw = await bufferFromReq(req);
    const form = new FormData();
    form.append("file", raw, { filename: "voice.wav", contentType: "audio/wav" });
    form.append("model_id", MODEL_ID);

    const url = "https://api.elevenlabs.io/v1/speech-to-text"; // confirm against ElevenLabs docs
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...(form as any).getHeaders?.(),
        "xi-api-key": ELEVEN,
      } as any,
      body: form as any,
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("ElevenLabs STT error:", txt);
      return res.status(500).json({ error: "STT failed", details: txt });
    }
    const data = await response.json();
    const text =
      (data && (data.text || data.transcript)) ??
      (data?.results && data.results[0]?.alternatives?.[0]?.transcript) ??
      JSON.stringify(data);
    return res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error", details: String(err) });
  }
}