'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';

interface HealthResponse {
  status: string;
  timestamp: string;
  version: string;
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setHealth(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">System Health</h1>
      <Card>
        <CardHeader>
          <CardTitle>Backend API Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          )}
          {error && (
            <div className="space-y-2">
              <Badge variant="prohibited">Unavailable</Badge>
              <p className="text-sm text-slate-500 mt-2">
                Could not reach backend API: {error}
              </p>
            </div>
          )}
          {health && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Status:</span>
                <Badge variant={health.status === 'ok' ? 'minimal' : 'prohibited'}>
                  {health.status}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Version:</span>
                <span className="text-sm text-slate-600">{health.version}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Timestamp:</span>
                <span className="text-sm text-slate-600">{health.timestamp}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
