// VulnerAI Chat Page
// INTENTIONALLY NON-COMPLIANT: No AI disclosure (violates Art. 50(1))
// No <AIDisclosure> component, no "powered by AI" label
'use client';

import { useState } from 'react';
import { chat } from '../../lib/ai';

export default function ChatPage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await chat(input);
      setMessages((prev) => [...prev, { role: 'assistant', content: response }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'system', content: 'Error: Failed to get response.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2>Chat</h2>
      <div>
        {messages.map((msg, i) => (
          <div key={i}>
            <strong>{msg.role}:</strong> {msg.content}
          </div>
        ))}
        {loading && <div>Thinking...</div>}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        placeholder="Ask me anything..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
