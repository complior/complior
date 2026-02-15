import Link from 'next/link';

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-center px-8 py-4 border-b border-[var(--b)]">
        <Link href="/" className="flex items-center gap-2 font-display text-lg font-bold text-[var(--dark)] tracking-tight">
          Complior
          <span className="font-mono text-[0.625rem] font-medium text-teal opacity-70">.ai</span>
        </Link>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
