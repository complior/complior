import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header mode="marketing" />
      <main className="flex-1 pt-14">{children}</main>
      <Footer />
    </div>
  );
}
