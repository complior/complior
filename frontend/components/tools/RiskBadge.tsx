import { Badge } from '@/components/ui/Badge';

const RISK_CONFIG: Record<string, { label: string; variant: 'prohibited' | 'high' | 'gpai' | 'limited' | 'minimal' | 'secondary' }> = {
  prohibited: { label: 'Verboten', variant: 'prohibited' },
  high: { label: 'Hochrisiko', variant: 'high' },
  gpai: { label: 'GPAI', variant: 'gpai' },
  limited: { label: 'Begrenztes Risiko', variant: 'limited' },
  minimal: { label: 'Minimales Risiko', variant: 'minimal' },
};

interface RiskBadgeProps {
  riskLevel: string | null;
  className?: string;
}

export function RiskBadge({ riskLevel, className }: RiskBadgeProps) {
  if (!riskLevel) {
    return <Badge variant="secondary" className={className}>Nicht klassifiziert</Badge>;
  }

  const config = RISK_CONFIG[riskLevel];
  if (!config) {
    return <Badge variant="secondary" className={className}>{riskLevel}</Badge>;
  }

  return <Badge variant={config.variant} className={className}>{config.label}</Badge>;
}
