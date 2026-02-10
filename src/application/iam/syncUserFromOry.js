'use strict';

const { ConflictError, ValidationError } = require('../../lib/errors.js');

const createUserSync = (db) => {
  const syncFromWebhook = async (payload) => {
    const { identity_id: oryId, email, name, locale } = payload;

    if (!oryId || !email) {
      throw new ValidationError('Missing required fields', {
        oryId: !oryId ? 'required' : undefined,
        email: !email ? 'required' : undefined,
      });
    }

    // Idempotent — check if user already exists
    const existing = await db.query(
      'SELECT "id", "organizationId" FROM "User" WHERE "oryId" = $1',
      [oryId],
    );
    if (existing.rows.length > 0) {
      return { user: existing.rows[0], created: false };
    }

    const fullName = name
      ? `${name.first || ''} ${name.last || ''}`.trim()
      : email.split('@')[0];

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // 1. Create Organization (placeholder — Step 2 of registration updates it)
      const orgResult = await client.query(
        `INSERT INTO "Organization" ("name", "industry", "size", "country")
         VALUES ($1, $2, $3, $4)
         RETURNING "id"`,
        [`${fullName}'s Organization (${oryId.slice(0, 8)})`, 'other', 'micro_1_9', 'DE'],
      );
      const organizationId = orgResult.rows[0].id;

      // 2. Create User
      const userResult = await client.query(
        `INSERT INTO "User" ("organizationId", "oryId", "email", "fullName", "active", "locale")
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING "id"`,
        [organizationId, oryId, email, fullName, true, locale || 'en'],
      );
      const userId = userResult.rows[0].id;

      // 3. Assign 'owner' role
      const roleResult = await client.query(
        'SELECT "roleId" FROM "Role" WHERE "name" = $1 AND "organizationIdId" IS NULL',
        ['owner'],
      );
      if (roleResult.rows.length > 0) {
        await client.query(
          'INSERT INTO "UserRole" ("userId", "roleId") VALUES ($1, $2)',
          [userId, roleResult.rows[0].roleId],
        );
      }

      // 4. Create free subscription
      const planResult = await client.query(
        'SELECT "planId" FROM "Plan" WHERE "name" = $1',
        ['free'],
      );
      if (planResult.rows.length > 0) {
        const now = new Date();
        const yearLater = new Date(now);
        yearLater.setFullYear(yearLater.getFullYear() + 1);
        await client.query(
          `INSERT INTO "Subscription" ("organizationId", "planId", "status", "currentPeriodStart", "currentPeriodEnd")
           VALUES ($1, $2, $3, $4, $5)`,
          [organizationId, planResult.rows[0].planId, 'active', now, yearLater],
        );
      }

      await client.query('COMMIT');
      return {
        user: { id: userId, organizationId, email, fullName },
        created: true,
      };
    } catch (err) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        // Unique violation — race condition, user was created concurrently
        // Retry with short delay to allow concurrent transaction to commit
        for (let attempt = 0; attempt < 3; attempt++) {
          await new Promise((r) => setTimeout(r, 100 * (attempt + 1)));
          const retry = await db.query(
            'SELECT "id", "organizationId" FROM "User" WHERE "oryId" = $1',
            [oryId],
          );
          if (retry.rows.length > 0) {
            return { user: retry.rows[0], created: false };
          }
        }
        throw new ConflictError('User already exists');
      }
      throw err;
    } finally {
      client.release();
    }
  };

  const syncOnLogin = async (session) => {
    if (!session || !session.identity) return null;
    const oryId = session.identity.id;
    const email = session.identity.traits?.email;
    const name = session.identity.traits?.name;
    const locale = session.identity.traits?.locale;

    // Check if user exists
    const existing = await db.query(
      `SELECT u."id", u."organizationId", u."email", u."fullName", u."active", u."locale",
              array_agg(r."name") FILTER (WHERE r."name" IS NOT NULL) AS roles
       FROM "User" u
       LEFT JOIN "UserRole" ur ON ur."userId" = u."id"
       LEFT JOIN "Role" r ON r."roleId" = ur."roleId"
       WHERE u."oryId" = $1
       GROUP BY u."id"`,
      [oryId],
    );

    if (existing.rows.length > 0) {
      // Update lastLoginAt
      await db.query(
        'UPDATE "User" SET "lastLoginAt" = NOW() WHERE "id" = $1',
        [existing.rows[0].id],
      );
      return existing.rows[0];
    }

    // Fallback: webhook missed — create user now
    const result = await syncFromWebhook({
      identity_id: oryId, // eslint-disable-line camelcase
      email,
      name,
      locale,
    });
    return result.user;
  };

  return { syncFromWebhook, syncOnLogin };
};

module.exports = createUserSync;
