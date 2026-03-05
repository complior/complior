'use strict';

module.exports = {
  host: process.env.HOST || '0.0.0.0',
  port: parseInt(process.env.PORT, 10) || 8000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
  },
  timeouts: {
    request: 30000,
    shutdown: 5000,
  },
  jwtSecret: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  platformAdminEmails: (process.env.PLATFORM_ADMIN_EMAILS || '').split(',').map((e) => e.trim()).filter(Boolean),
};
