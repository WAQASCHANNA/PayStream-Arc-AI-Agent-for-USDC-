import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ error: "no text" });

  const WORKERS_KEY = process.env.WORKERS_AI_KEY;
  const accountId = process.env.WORKERS_AI_ACCOUNT_ID;
  if (!WORKERS_KEY || !accountId) {
    return res.status(500).json({ error: "missing WORKERS_AI env vars" });
  }

  const model = "@cf/meta/llama-3.1-8b-instruct"; // adjust per your setup

  const prompt = `
You are an assistant that extracts payments agreements from user utterances.
Input: "${text}"
Output JSON with fields:
{
  "recipients": ["0x..."],
  "amounts": ["1.00"],    // as string units in USD (for USDC)
  "deadline_hours": 24,
  "condition": "invoice:123 paid",
  "notes": "short human summary"
}
Return only JSON.
`;

  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${WORKERS_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Workers AI error:", txt);
      return res.status(500).json({ error: "AI failed", details: txt });
    }
    const aiRes = await resp.json();
    const raw: string = aiRes?.result?.output_text ?? aiRes?.result?.response ?? JSON.stringify(aiRes);
    let agreement: any = {};
    try {
      agreement = JSON.parse(raw);
    } catch (e) {
      const match = typeof raw === "string" ? raw.match(/\{[\s\S]*\}/) : null;
      agreement = match ? JSON.parse(match[0]) : { raw };
    }
    return res.status(200).json({ agreement });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "server error", details: String(err) });
  }
}