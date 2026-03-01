import type { Domain, DomainHooks } from '../types.js';
import { hrHooks } from './hr.js';
import { financeHooks } from './finance.js';
import { healthcareHooks } from './healthcare.js';
import { educationHooks } from './education.js';
import { legalHooks } from './legal.js';
import { contentHooks } from './content.js';

const DOMAIN_REGISTRY: Record<Domain, DomainHooks> = {
  hr: hrHooks,
  finance: financeHooks,
  healthcare: healthcareHooks,
  education: educationHooks,
  legal: legalHooks,
  content: contentHooks,
};

export const getDomainHooks = (domain: Domain): DomainHooks => {
  return DOMAIN_REGISTRY[domain];
};

export const mergeDomainHooks = (domains: readonly Domain[]): DomainHooks => {
  const allPre = domains.flatMap((d) => [...getDomainHooks(d).pre]);
  const allPost = domains.flatMap((d) => [...getDomainHooks(d).post]);
  return { pre: allPre, post: allPost };
};
