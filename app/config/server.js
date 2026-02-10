'use strict';

module.exports = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT, 10) || 8000,
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
  timeouts: {
    request: 30000,
    shutdown: 5000,
  },
};
