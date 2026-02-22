/**
 * Per-tool passive scan orchestrator.
 * Fetches URLs for a tool and assembles PassiveScanData.
 */

import type { PassiveScanData } from '../types.js';
import type { RegistryTool } from '../types.js';
import { fetchAllPages } from './fetcher.js';
import {
  parseDisclosure,
  parsePrivacyPolicy,
  parseTos,
  parseTrust,
  parseModelCard,
  parseContentMarking,
  parseInfra,
  parseSocial,
  parseWebSearch,
} from './parsers.js';

export async function scanTool(tool: RegistryTool): Promise<PassiveScanData> {
  const pages = await fetchAllPages(tool.website);

  const pagesFetched = [
    pages.homepage,
    pages.privacy,
    pages.terms,
    pages.about,
    pages.trust,
    pages.responsibleAi,
    pages.compliance,
    pages.robots,
    pages.aiPlugin,
  ].filter(Boolean).length;

  return {
    disclosure: parseDisclosure(pages),
    privacy_policy: parsePrivacyPolicy(pages),
    tos: parseTos(pages),
    trust: parseTrust(pages),
    model_card: parseModelCard(pages),
    content_marking: parseContentMarking(pages),
    infra: parseInfra(pages),
    social: parseSocial(tool.provider.name),
    web_search: parseWebSearch(),
    scanned_at: new Date().toISOString(),
    pages_fetched: pagesFetched,
  };
}
