'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import dynamic from 'next/dynamic';
import { getSession } from '@/lib/auth';
import { Hero } from '@/components/landing/Hero';
import { ScrollReveal } from '@/components/landing/ScrollReveal';

const PainCards = dynamic(() => import('@/components/landing/PainCards').then(m => ({ default: m.PainCards })));
const Capabilities = dynamic(() => import('@/components/landing/Capabilities').then(m => ({ default: m.Capabilities })));
const ComparisonTable = dynamic(() => import('@/components/landing/ComparisonTable').then(m => ({ default: m.ComparisonTable })));
const ProcessSteps = dynamic(() => import('@/components/landing/ProcessSteps').then(m => ({ default: m.ProcessSteps })));
const FeatureGrid = dynamic(() => import('@/components/landing/FeatureGrid').then(m => ({ default: m.FeatureGrid })));
const Testimonials = dynamic(() => import('@/components/landing/Testimonials').then(m => ({ default: m.Testimonials })));
const FreeTools = dynamic(() => import('@/components/landing/FreeTools').then(m => ({ default: m.FreeTools })));
const DualAudience = dynamic(() => import('@/components/landing/DualAudience').then(m => ({ default: m.DualAudience })));
const InlinePricing = dynamic(() => import('@/components/landing/InlinePricing').then(m => ({ default: m.InlinePricing })));
const TrustBadges = dynamic(() => import('@/components/landing/TrustBadges').then(m => ({ default: m.TrustBadges })));
const FAQ = dynamic(() => import('@/components/landing/FAQ').then(m => ({ default: m.FAQ })));
const CTASection = dynamic(() => import('@/components/landing/CTASection').then(m => ({ default: m.CTASection })));

export default function LandingPage() {
  const router = useRouter();
  const locale = useLocale();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getSession().then((session) => {
      if (session) {
        router.replace(`/${locale}/dashboard`);
      } else {
        setReady(true);
      }
    });
  }, [router, locale]);

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--b2)] border-t-[var(--teal)]" />
      </div>
    );
  }

  return (
    <>
      <Hero />
      <ScrollReveal>
        <PainCards />
      </ScrollReveal>
      <ScrollReveal>
        <Capabilities />
      </ScrollReveal>
      <ScrollReveal>
        <ComparisonTable />
      </ScrollReveal>
      <ScrollReveal>
        <ProcessSteps />
      </ScrollReveal>
      <ScrollReveal>
        <FeatureGrid />
      </ScrollReveal>
      <ScrollReveal>
        <Testimonials />
      </ScrollReveal>
      <ScrollReveal id="free-tools">
        <FreeTools />
      </ScrollReveal>
      <ScrollReveal>
        <DualAudience />
      </ScrollReveal>
      <ScrollReveal id="pricing">
        <InlinePricing />
      </ScrollReveal>
      <ScrollReveal>
        <TrustBadges />
      </ScrollReveal>
      <ScrollReveal id="faq">
        <FAQ />
      </ScrollReveal>
      <CTASection />
    </>
  );
}
