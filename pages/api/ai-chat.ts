import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages } = req.body; // array: [{role:"user"/"assistant", content:"..."}]
  if (!Array.isArray(messages)) return res.status(400).json({ error: "No messages" });

  // --- Use your OpenAI API key securely ---
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No API key" });

  try {
    const apiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages,
        max_tokens: 600,
        temperature: 0.5
      }),
    });
    const data = await apiRes.json();
    // Extract the assistant's reply
    const reply = data?.choices?.[0]?.message?.content || "No response";
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: "AI error" });
  }
}
