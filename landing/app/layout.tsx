import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Complior — AI Act Compliance in your Terminal",
  description:
    "Scan your AI project for EU AI Act compliance in seconds. Auto-fix violations, generate audit reports, ship with confidence.",
  openGraph: {
    title: "Complior — AI Act Compliance in your Terminal",
    description: "Score, Fix, Ship. EU AI Act compliance scanner & fixer.",
    url: "https://complior.ai",
    siteName: "Complior",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Complior — AI Act Compliance Scanner",
    description: "Score, Fix, Ship. EU AI Act compliance in your terminal.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0a0a0a", color: "#ededed" }}>
        {children}
      </body>
    </html>
  );
}
