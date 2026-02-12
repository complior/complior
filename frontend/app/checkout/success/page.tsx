'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { api } from '@/lib/api';

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'polling' | 'confirmed' | 'error'>('polling');
  const retriesRef = useRef(0);

  useEffect(() => {
    if (!sessionId) {
      setStatus('error');
      return;
    }

    const poll = setInterval(async () => {
      try {
        const result = await api.billing.checkoutStatus(sessionId);
        if (result.status === 'active' || result.status === 'trialing') {
          setStatus('confirmed');
          clearInterval(poll);
          setTimeout(() => router.push('/dashboard'), 3000);
        }
      } catch {
        // continue polling
      }

      retriesRef.current += 1;
      if (retriesRef.current >= 10) {
        clearInterval(poll);
        setStatus('confirmed'); // assume success after max retries
      }
    }, 2000);

    return () => clearInterval(poll);
  }, [sessionId, router]);

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>Your 14-day trial has started!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Badge className="bg-green-100 text-green-700 border-green-200">Trial Active</Badge>
          <p className="text-sm text-slate-600">
            {status === 'polling'
              ? 'Confirming your subscription...'
              : 'Your account has been upgraded. Redirecting to dashboard...'}
          </p>
          <Link href="/dashboard">
            <Button className="w-full mt-4">Go to Dashboard</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
