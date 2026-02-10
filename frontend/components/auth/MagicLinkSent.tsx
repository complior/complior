'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface MagicLinkSentProps {
  email: string;
  onBack: () => void;
}

export function MagicLinkSent({ email, onBack }: MagicLinkSentProps) {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>E-Mail gesendet</CardTitle>
        <CardDescription>
          Wir haben einen Magic Link an <strong>{email}</strong> gesendet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-center">
        <p className="text-sm text-slate-500">
          Klicken Sie auf den Link in der E-Mail, um sich anzumelden.
          Der Link ist 15 Minuten gültig.
        </p>
        <Button variant="ghost" onClick={onBack}>
          Zurück zur Anmeldung
        </Button>
      </CardContent>
    </Card>
  );
}
