// AI utility — missing C2PA content marking (OBL-016) and kill switch (OBL-010)
import OpenAI from "openai";

const openai = new OpenAI();

// No content marking — violates OBL-016, Art. 50(2)
// No kill switch / shutdown mechanism — violates OBL-010, Art. 14
export async function generateContent(prompt: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content ?? "";
}

// No source attribution for AI-generated content
export async function summarize(text: string): Promise<string> {
  return generateContent(`Summarize: ${text}`);
}
