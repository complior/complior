/**
 * @deprecated V1-M11: All routes moved to:
 *   - Passport CRUD → passport.route.ts (/passport/*)
 *   - Document generation → fix.route.ts (/fix/doc/*)
 *
 * This file is kept to ensure old /agent/* routes return 404 after migration.
 * Previously mounted route handlers have been removed.
 *
 * DO NOT add new handlers here. Remove this file after all callers migrated.
 */
import { Hono } from 'hono';
import { AppError } from '../../types/errors.js';
import type { PassportService } from '../../services/passport-service.js';

// All /agent/* routes return 404 — deprecated, migrated to /passport/* and /fix/doc/*

export const createAgentRoute = (_passportService: PassportService) => {
  const app = new Hono();

  // All routes return 404 — deprecated, migrated to /passport/* and /fix/doc/*
  app.all('/agent/*', () => {
    throw new AppError(
      'Route migrated: /agent/* → /passport/* (passport) or /fix/doc/* (documents)',
      'ROUTE_MIGRATED',
      404,
    );
  });

  return app;
};
