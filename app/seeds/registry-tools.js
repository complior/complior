'use strict';

const catalog = require('./catalog.js');

const deriveJurisdictions = (dataResidency) => {
  if (!dataResidency) return null;
  const map = {
    EU: ['EU', 'EEA'],
    US: ['US'],
    global: ['EU', 'EEA', 'US', 'UK', 'APAC'],
    UK: ['UK'],
  };
  return map[dataResidency] || [dataResidency];
};

const extractDomain = (websiteUrl) => {
  if (!websiteUrl) return null;
  try {
    const { hostname } = new URL(websiteUrl);
    return [hostname.replace(/^www\./, '')];
  } catch {
    return null;
  }
};

const registryTools = catalog.map((tool) => ({
  name: tool.name,
  provider: tool.vendor,
  category: tool.category,
  riskLevel: tool.defaultRiskLevel || 'minimal',
  description: tool.description || null,
  websiteUrl: tool.websiteUrl || null,
  vendorCountry: tool.vendorCountry || null,
  dataResidency: tool.dataResidency || null,
  capabilities: tool.domains || null,
  jurisdictions: deriveJurisdictions(tool.dataResidency),
  detectionPatterns: extractDomain(tool.websiteUrl),
  evidence: null,
  active: tool.active,
}));

module.exports = registryTools;
