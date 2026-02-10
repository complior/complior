'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

interface LoginFormProps {
  onSubmitPassword: (email: string, password: string) => Promise<void>;
  onSubmitMagicLink: (email: string) => Promise<void>;
  error: string | null;
  loading: boolean;
}

export function LoginForm({ onSubmitPassword, onSubmitMagicLink, error, loading }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'magic_link' | 'password'>('magic_link');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'password') {
      await onSubmitPassword(email, password);
    } else {
      await onSubmitMagicLink(email);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-Mail-Adresse</Label>
        <Input
          id="email"
          type="email"
          placeholder="name@unternehmen.de"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />
      </div>

      {mode === 'password' && (
        <div className="space-y-2">
          <Label htmlFor="password">Passwort</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Wird geladen...' : mode === 'magic_link' ? 'Magic Link senden' : 'Anmelden'}
      </Button>

      <button
        type="button"
        onClick={() => setMode(mode === 'magic_link' ? 'password' : 'magic_link')}
        className="w-full text-center text-sm text-primary-600 hover:underline"
      >
        {mode === 'magic_link' ? 'Mit Passwort anmelden' : 'Magic Link verwenden'}
      </button>
    </form>
  );
}
