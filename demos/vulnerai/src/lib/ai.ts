// VulnerAI AI Module
// INTENTIONALLY NON-COMPLIANT:
// - No C2PA content marking (violates Art. 50(2))
// - No kill switch / disable mechanism (violates Art. 14)
// - No interaction logging (violates Art. 12)
// - No prohibited practice screening (violates Art. 5)
// - Raw OpenAI API call without any compliance middleware

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function chat(userMessage: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: userMessage },
    ],
  });

  return response.choices[0]?.message?.content ?? 'No response';
}
