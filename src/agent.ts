import { OpenAI } from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function classifyEmail(email: string): Promise<string> {
  // MISSING: SDK wrapper, disclosure, logging
  const response = await client.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: `Classify: ${email}` }],
  });
  return response.choices[0].message.content || "unknown";
}
