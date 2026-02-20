import Link from 'next/link';

export default function Home() {
  return (
    <main>
      <h1>VulnerAI</h1>
      <p>An AI-powered assistant for your questions.</p>
      <Link href="/chat">Start Chatting</Link>
    </main>
  );
}
