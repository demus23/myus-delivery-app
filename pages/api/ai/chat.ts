import type { NextApiRequest, NextApiResponse } from "next";

// Types for features and user roles
type Feature = "chat" | "shipping" | "consolidation" | "product" | "translation";
type UserType = "admin" | "user";

const systemPrompts: Record<Feature, Record<UserType, string>> = {
  chat: {
    admin: `You are an AI assistant for logistics/delivery company admins. Answer questions, help with analytics, operational tips, and customer support guidance.`,
    user: `You are an AI assistant for users of a package forwarding/delivery service. Help them track, ship, and optimize their shipping experience.`
  },
  shipping: {
    admin: `You're an AI shipping cost optimizer for delivery business admins. Give actionable cost-saving tips based on origin, destination, and weight.`,
    user: `You help users save money on shipping based on their route and package details.`
  },
  consolidation: {
    admin: `You are an AI for package consolidation. Suggest optimal ways for admins to combine shipments for lowest cost and highest efficiency.`,
    user: `You help users decide how to group packages for best savings and fewer shipments.`
  },
  product: {
    admin: `You are an AI sourcing agent. Help admins or users find the best suppliers, compare prices, and summarize reviews.`,
    user: `You help users search for products, compare prices, and make recommendations.`
  },
  translation: {
    admin: `You are an AI language translator. Translate any text provided and detect the language. Respond with only the translation.`,
    user: `You are an AI translator for users. Respond only with the translated text.`
  }
};

interface Message {
  sender: string;
  text: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { messages, userType, feature } = req.body as {
    messages: Message[];
    userType: UserType;
    feature: Feature;
  };

  let systemPrompt = (systemPrompts[feature]?.[userType]) || "You are a helpful assistant.";
  let lastMsg = messages[messages.length - 1]?.text || "";

  // For translation, allow user to specify language as "|LANG: Arabic"
  if (feature === "translation" && lastMsg.includes("|LANG:")) {
    const [text, lang] = lastMsg.split("|LANG:").map((s: string) => s.trim());
    systemPrompt += `\nTranslate the following into ${lang}: "${text}". Reply only with the translation.`;
    lastMsg = text;
  }

  const history = messages.map((m: Message) => ({
    role: m.sender === "user" ? "user" : "assistant",
    content: m.text
  }));

  try {
    const result = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "system", content: systemPrompt }, ...history],
        max_tokens: 250,
        temperature: 0.4
      })
    });
    const data = await result.json();
    const reply = data.choices?.[0]?.message?.content || "I'm not sure.";
    res.status(200).json({ reply });
  } catch (err) {
    res.status(500).json({ reply: "AI service error." });
  }
}
