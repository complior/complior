'use strict';

module.exports = {
  url: process.env.GOTENBERG_URL || 'http://localhost:3000',
  timeout: parseInt(process.env.GOTENBERG_TIMEOUT, 10) || 30000,
};
