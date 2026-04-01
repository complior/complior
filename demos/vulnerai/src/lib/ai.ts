// VulnerAI AI Module
// INTENTIONALLY NON-COMPLIANT:
// - No C2PA content marking (violates Art. 50(2))
// - No kill switch / disable mechanism (violates Art. 14)
// - No interaction logging (violates Art. 12)
// - No prohibited practice screening (violates Art. 5)
// - Raw OpenAI API call without any compliance middleware

import OpenAI from 'openai';
import { complior } from '@complior/sdk';

const openai = complior(new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}));

export async function chat(userMessage: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
    { role: 'user', content: userMessage },
    ],
    });
  } catch (err) {
    console.error('LLM call failed:', err);
    throw err;
  }

  return response.choices[0]?.message?.content ?? 'No response';
}
