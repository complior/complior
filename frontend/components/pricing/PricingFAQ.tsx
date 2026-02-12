'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FAQItem {
  question: string;
  answer: string;
}

const faqs: FAQItem[] = [
  {
    question: 'What is the EU AI Act and does it apply to my company?',
    answer:
      'The EU AI Act is the world\'s first comprehensive AI regulation. It applies to any organization deploying AI systems that affect people in the EU, regardless of where your company is based (Art. 2 extraterritorial scope). If you use AI tools like ChatGPT, hiring software, or automated decision-making, you likely need to comply.',
  },
  {
    question: 'Can I try a paid plan before committing?',
    answer:
      'Yes! All paid plans come with a 14-day free trial. You need a payment method to start the trial, but you won\'t be charged until the trial ends. Cancel anytime during the trial at no cost.',
  },
  {
    question: 'What happens when I exceed my plan limits?',
    answer:
      'You\'ll receive a notification when approaching your limits. You can upgrade your plan at any time to get more AI tools, users, or features. Your data is never deleted — you simply won\'t be able to add new tools until you upgrade.',
  },
  {
    question: 'Can I switch plans or cancel anytime?',
    answer:
      'Absolutely. You can upgrade, downgrade, or cancel your subscription at any time. When upgrading, you\'ll be prorated for the remainder of your billing cycle. When downgrading, the change takes effect at the end of your current period.',
  },
  {
    question: 'Is my data stored in the EU?',
    answer:
      'Yes. All data is hosted on Hetzner servers in Germany, ensuring full GDPR and EU AI Act data residency compliance. We never transfer data outside the EU.',
  },
  {
    question: 'What is Eva, the AI compliance assistant?',
    answer:
      'Eva is our AI-powered compliance assistant that helps you navigate AI Act requirements, answers compliance questions, and provides guidance on risk classification and mitigation. Higher plans include more Eva queries per month.',
  },
  {
    question: 'Do you offer discounts for NGOs or startups?',
    answer:
      'Yes, we offer special pricing for non-profits, educational institutions, and early-stage startups. Contact us at sales@aiact-compliance.eu to learn more.',
  },
];

export function PricingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="mx-auto max-w-3xl divide-y divide-slate-200">
      {faqs.map((faq, index) => (
        <div key={index}>
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="flex w-full items-center justify-between py-5 text-left"
          >
            <span className="text-sm font-medium text-slate-900">{faq.question}</span>
            <ChevronDown
              className={cn(
                'ml-4 h-5 w-5 shrink-0 text-slate-500 transition-transform',
                openIndex === index && 'rotate-180'
              )}
            />
          </button>
          {openIndex === index && (
            <p className="pb-5 text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
}
