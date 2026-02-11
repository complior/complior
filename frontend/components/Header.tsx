'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-14 items-center px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Shield className="h-5 w-5 text-primary-600" />
          <span>AI Act Compliance</span>
        </Link>
        <nav className="ml-auto flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
            Dashboard
          </Link>
          <Link href="/tools/inventory" className="text-slate-600 hover:text-slate-900 transition-colors">
            Inventar
          </Link>
          <Link href="/tools/catalog" className="text-slate-600 hover:text-slate-900 transition-colors">
            Katalog
          </Link>
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
            AI Literacy
          </Link>
          <Link href="/dashboard" className="text-slate-600 hover:text-slate-900 transition-colors">
            Documents
          </Link>
        </nav>
      </div>
    </header>
  );
}
