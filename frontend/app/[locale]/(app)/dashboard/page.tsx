import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-ctr px-8 py-8">
      <h1 className="text-3xl font-bold tracking-tight text-[var(--dark)] mb-6">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--dark4)]">
            The deployer dashboard with AI Tool Risk Inventory, AI Literacy Progress,
            Compliance Score, and Deadlines will be available in a future sprint.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
