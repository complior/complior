import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Dashboard</h1>
      <Card>
        <CardHeader>
          <CardTitle>Coming in Sprint 3</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500">
            The deployer dashboard with AI Tool Risk Inventory, AI Literacy Progress,
            Compliance Score, and Deadlines will be available in Sprint 3.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
