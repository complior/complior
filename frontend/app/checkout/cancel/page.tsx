'use client';

import { useSearchParams } from 'next/navigation';
import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function CheckoutCancelPage() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan') || '';
  const period = searchParams.get('period') || 'monthly';

  const registerUrl = plan
    ? `/auth/register?plan=${plan}&period=${period}`
    : '/auth/register';

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
            <XCircle className="h-6 w-6 text-slate-500" />
          </div>
          <CardTitle>Payment not completed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Your payment was not completed. No charges have been made.
          </p>
          <div className="flex flex-col gap-2">
            <Link href={registerUrl}>
              <Button className="w-full">Try Again</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary" className="w-full">
                Continue with Free Plan
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
