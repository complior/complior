'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { LockedOverlay } from '@/components/ui/LockedOverlay';

export function TrainingUsers() {
  const t = useTranslations('members');

  return (
    <Card className="relative overflow-hidden">
      <CardHeader>
        <CardTitle className="text-lg">{t('trainingUsers')}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-[var(--dark5)] mb-4">{t('trainingDesc')}</p>
        <div className="h-24" />
      </CardContent>
      <LockedOverlay
        title={t('lockedTraining')}
        description={t('lockedTrainingDesc')}
        sprint={t('lockedSprint')}
      />
    </Card>
  );
}
