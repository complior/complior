import React from 'react';
import type { RegistryTool } from '@/lib/registry';
import {
  generateBreadcrumbJsonLd,
  generateSoftwareAppJsonLd,
  generateFAQJsonLd,
  generateToolFAQs,
} from '@/lib/registry-seo';

interface ToolJsonLdProps {
  tool: RegistryTool;
}

export function ToolJsonLd({ tool }: ToolJsonLdProps) {
  const breadcrumb = generateBreadcrumbJsonLd(tool);
  const softwareApp = generateSoftwareAppJsonLd(tool);
  const faqs = generateToolFAQs(tool);
  const faqJsonLd = generateFAQJsonLd(faqs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
