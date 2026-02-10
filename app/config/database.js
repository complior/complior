'use strict';

const parseDbUrl = (url) => {
  if (!url) return null;
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port, 10) || 5432,
    database: parsed.pathname.slice(1),
    user: parsed.username,
    password: parsed.password,
  };
};

module.exports = {
  ...parseDbUrl(process.env.DATABASE_URL),
  max: parseInt(process.env.DB_POOL_SIZE, 10) || 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};
