'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/Badge';

const RISK_VARIANTS: Record<string, 'prohibited' | 'high' | 'gpai' | 'limited' | 'minimal'> = {
  prohibited: 'prohibited',
  high: 'high',
  gpai: 'gpai',
  limited: 'limited',
  minimal: 'minimal',
};

interface RiskBadgeProps {
  riskLevel: string | null;
  className?: string;
}

export function RiskBadge({ riskLevel, className }: RiskBadgeProps) {
  const t = useTranslations('dashboard');

  if (!riskLevel) {
    return <Badge variant="secondary" className={className}>{t('noClassifiedTools').length > 20 ? '—' : t('noClassifiedTools')}</Badge>;
  }

  const variant = RISK_VARIANTS[riskLevel];
  if (!variant) {
    return <Badge variant="secondary" className={className}>{riskLevel}</Badge>;
  }

  return <Badge variant={variant} className={className}>{t(riskLevel as 'prohibited' | 'high' | 'gpai' | 'limited' | 'minimal')}</Badge>;
}
