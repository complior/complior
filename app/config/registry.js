'use strict';

/**
 * Registry configuration
 */
module.exports = {
  // Number of classified tools to refresh per job run
  refreshBatchSize: parseInt(process.env.REGISTRY_REFRESH_BATCH_SIZE, 10) || 100,

  // Enable/disable automatic refresh
  autoRefreshEnabled: process.env.REGISTRY_AUTO_REFRESH !== 'false',

  // Refresh interval in days (skip tools scored within this window)
  refreshIntervalDays: parseInt(process.env.REGISTRY_REFRESH_INTERVAL, 10) || 30,

  // v3: Public scan settings
  publicScan: {
    maxPerDay: parseInt(process.env.REGISTRY_PUBLIC_SCAN_MAX, 10) || 100,
    endpointCooldownDays: parseInt(process.env.REGISTRY_ENDPOINT_COOLDOWN, 10) || 30,
  },

  // v3: Vendor claim settings
  vendorClaim: {
    verificationMethods: ['dns_txt', 'meta_tag', 'well_known'],
    verificationTokenTTLHours: 72,
    reviewSLAHours: 48,
  },
};
