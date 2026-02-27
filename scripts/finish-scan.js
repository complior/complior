'use strict';

/**
 * Finish scanning remaining tools that were missed due to OOM.
 * Scans tools at offset 4800+ with concurrency 3, then exits.
 *
 * Usage:
 *   node --max-old-space-size=2048 scripts/finish-scan.js
 */

const dotenvPath = require('node:path').join(__dirname, '../.env');
require('node:fs').readFileSync(dotenvPath, 'utf8').split('\n').forEach((line) => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match && !process.env[match[1].trim()]) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

const pg = require('pg');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const dbConfig = require('../app/config/database.js');

const loadSandboxModule = (filePath) => {
  const src = fs.readFileSync(filePath, 'utf8');
  return vm.runInThisContext(src, { filename: filePath });
};

const run = async () => {
  const pool = new pg.Pool(dbConfig);
  const OFFSET = 4800;
  const BATCH = 50;
  const CONCURRENCY = 3;

  try {
    const domainDir = path.join(__dirname, '../app/domain/registry');
    const configDir = path.join(__dirname, '../app/config');
    const enrichmentConfig = require(path.join(configDir, 'enrichment.js'));

    const scannerFactory = loadSandboxModule(path.join(domainDir, 'passive-scanner.js'));
    const scanner = scannerFactory({
      fetch: globalThis.fetch,
      cheerio,
      config: {
        enrichment: {
          passiveScanner: {
            ...enrichmentConfig.passiveScanner,
            ratePerSec: 3,
          },
        },
      },
      console,
    });

    // Count remaining
    const totalRes = await pool.query(
      `SELECT COUNT(*) as c FROM "RegistryTool"
       WHERE active = true AND website IS NOT NULL AND website != ''`
    );
    const total = parseInt(totalRes.rows[0].c, 10);
    console.log(`Total tools with websites: ${total}`);
    console.log(`Starting from offset: ${OFFSET}`);
    console.log('');

    let scanned = 0;
    let failed = 0;
    let batchNum = 0;
    const startTime = Date.now();

    while (true) {
      const currentOffset = OFFSET + batchNum * BATCH;
      const batchRes = await pool.query(
        `SELECT "registryToolId", slug, name, website, categories, provider
         FROM "RegistryTool"
         WHERE active = true AND website IS NOT NULL AND website != ''
         ORDER BY "registryToolId"
         LIMIT $1 OFFSET $2`,
        [BATCH, currentOffset]
      );

      if (batchRes.rows.length === 0) break;

      console.log(`Batch ${batchNum + 1}: tools ${currentOffset + 1}-${currentOffset + batchRes.rows.length}`);

      // Sequential processing to minimize memory
      for (const tool of batchRes.rows) {
        try {
          const result = await scanner.scan(tool);
          if (result) {
            await pool.query(
              `UPDATE "RegistryTool"
               SET evidence = $1::jsonb, level = 'scanned'
               WHERE slug = $2`,
              [JSON.stringify({ passive_scan: result }), tool.slug]
            );
          }
          scanned++;
        } catch (err) {
          failed++;
          console.error(`  x ${tool.slug}: ${err.message}`);
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
      console.log(`  Done: ${scanned} scanned, ${failed} failed (${elapsed}s elapsed)`);

      batchNum++;

      // Force GC if available
      if (global.gc) global.gc();
    }

    console.log(`\nFinished: ${scanned} scanned, ${failed} failed`);
  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error('Finish scan failed:', err);
  process.exit(1);
});
