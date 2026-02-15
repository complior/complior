import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="font-display text-6xl font-bold text-[var(--dark)]">404</h1>
      <p className="mt-4 text-lg text-[var(--dark5)]">Page not found</p>
      <Link href="/en" className="mt-6">
        <Button>Back to Home</Button>
      </Link>
    </div>
  );
}
