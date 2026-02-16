'use strict';

const pg = require('pg');
const dbConfig = require('../app/config/database.js');

const main = async () => {
  const emails = (process.env.PLATFORM_ADMIN_EMAILS || '')
    .split(',')
    .map(e => e.trim())
    .filter(Boolean);

  if (emails.length === 0) {
    console.log('No PLATFORM_ADMIN_EMAILS set. Nothing to do.');
    process.exit(0);
  }

  const pool = new pg.Pool(dbConfig);

  try {
    // Ensure platform_admin role exists
    const roleResult = await pool.query(
      `SELECT "roleId" FROM "Role" WHERE "name" = 'platform_admin'`,
    );

    if (roleResult.rows.length === 0) {
      console.error('Error: platform_admin role not found. Run seeds first.');
      process.exit(1);
    }

    const roleId = roleResult.rows[0].roleId;

    for (const email of emails) {
      const userResult = await pool.query(
        `SELECT "id", "email" FROM "User" WHERE "email" = $1`,
        [email],
      );

      if (userResult.rows.length === 0) {
        console.log(`User not found: ${email} — skipping`);
        continue;
      }

      const userId = userResult.rows[0].id;

      await pool.query(
        `INSERT INTO "UserRole" ("userId", "roleId")
         VALUES ($1, $2)
         ON CONFLICT ("userId", "roleId") DO NOTHING`,
        [userId, roleId],
      );

      console.log(`Assigned platform_admin role to: ${email} (userId=${userId})`);
    }
  } finally {
    await pool.end();
  }
};

main().catch((err) => {
  console.error('assign-admin failed:', err.message);
  process.exit(1);
});
