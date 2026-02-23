'use strict';

/**
 * Registry configuration
 */
module.exports = {
  // Number of classified tools to refresh per job run
  refreshBatchSize: parseInt(process.env.REGISTRY_REFRESH_BATCH_SIZE, 10) || 100,

  // Enable/disable automatic refresh
  autoRefreshEnabled: process.env.REGISTRY_AUTO_REFRESH !== 'false',
};
