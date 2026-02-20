export const metadata = {
  title: 'VulnerAI Chat',
  description: 'AI-powered chatbot',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
