import { Header } from '@/components/Header';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header mode="app" />
      <main className="flex-1 pt-14">{children}</main>
      <footer className="border-t border-[var(--b)] py-4 text-center font-mono text-[0.5625rem] text-[var(--dark5)]">
        Complior.ai
      </footer>
    </div>
  );
}
