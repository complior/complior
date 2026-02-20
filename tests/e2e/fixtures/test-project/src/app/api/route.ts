// API route — intentionally processes PII without consent (OBL-023)
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { message, email, name } = await request.json();

  // Direct PII processing without user consent — violates GDPR Art. 5 / OBL-023
  const userData = { email, name, ip: request.headers.get("x-forwarded-for") };

  // No logging of AI interactions — violates OBL-006a
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [{ role: "user", content: message }],
    }),
  });

  const data = await response.json();
  return NextResponse.json({ reply: data.choices[0].message.content });
}
