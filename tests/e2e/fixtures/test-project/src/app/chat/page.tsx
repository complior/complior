// AI Chatbot page — intentionally missing AI disclosure (OBL-015, Art. 50(1))
"use client";
import { useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    const response = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: input }),
    });
    const data = await response.json();
    setMessages([...messages, { role: "user", content: input }, { role: "assistant", content: data.reply }]);
    setInput("");
  };

  return (
    <div>
      <h1>AI Assistant</h1>
      {/* Missing: <AIDisclosure /> component — violates OBL-015 */}
      <div>
        {messages.map((m, i) => (
          <div key={i}>{m.role}: {m.content}</div>
        ))}
      </div>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
