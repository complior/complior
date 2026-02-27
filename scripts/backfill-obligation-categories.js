'use strict';

const pg = require('pg');
const dbConfig = require('../app/config/database.js');

const run = async () => {
  const pool = new pg.Pool(dbConfig);

  // Map OBL prefix to category based on article references
  const mapping = {
    'OBL-001': 'ai_literacy',             // Art.4
    'OBL-002': 'transparency',            // Art.5 prohibited practices
    'OBL-003': 'risk_management',          // Art.9
    'OBL-004': 'data_governance',          // Art.10
    'OBL-005': 'record_keeping',           // Art.12
    'OBL-006': 'transparency',             // Art.13
    'OBL-007': 'human_oversight',          // Art.14
    'OBL-008': 'human_oversight',          // Art.14
    'OBL-009': 'monitoring',               // Art.15
    'OBL-010': 'registration',             // Art.16/49
    'OBL-011': 'deployer_obligations',     // Art.26
    'OBL-012': 'fria',                     // Art.27
    'OBL-013': 'monitoring',               // Art.26 monitoring
    'OBL-014': 'record_keeping',           // Art.26 logs
    'OBL-015': 'transparency',             // Art.50(1)
    'OBL-016': 'transparency',             // Art.50(2)
    'OBL-017': 'transparency',             // Art.50(3)
    'OBL-018': 'transparency',             // Art.50(4)
    'OBL-019': 'registration',             // Conformity assessment + CE marking
    'OBL-020': 'post_market_monitoring',   // Post-market monitoring system
    'OBL-021': 'monitoring',               // Serious incident reporting
    'OBL-022': 'transparency',             // GPAI documentation (Annex XI/XII)
    'OBL-023': 'risk_management',          // GPAI systemic risk evaluation
    'OBL-024': 'transparency',             // Explain AI decisions
    'OBL-025': 'deployer_obligations',     // Cooperate with authorities
    'OBL-026': 'record_keeping',           // AI system inventory + traceability
    'OBL-027': 'registration',             // Non-EU: appoint authorised rep
    'OBL-028': 'registration',             // GPAI non-EU: appoint authorised rep
    'OBL-029': 'deployer_obligations',     // Deployer-becomes-provider
    'OBL-030': 'deployer_obligations',     // Complaint mechanism
    'OBL-031': 'deployer_obligations',     // Deployer: inform provider of misuse
    'OBL-032': 'transparency',             // GPAI open-source reduced docs
    'OBL-033': 'risk_management',          // Assess high-risk classification
    'OBL-034': 'deployer_obligations',     // Provider master compliance checklist
    'OBL-035': 'deployer_obligations',     // Provide info to authorities
    'OBL-036': 'deployer_obligations',     // Value chain liability
    'OBL-037': 'registration',             // CE marking
    'OBL-038': 'transparency',             // Voluntary codes of conduct
    'OBL-039': 'registration',             // Conformity assessment procedure
  };

  // Sector-specific obligations → map by prefix
  const sectorMapping = {
    'OBL-HR':  'deployer_obligations',     // HR/employment
    'OBL-FIN': 'risk_management',          // Finance
    'OBL-MED': 'risk_management',          // Medical
    'OBL-EDU': 'deployer_obligations',     // Education
    'OBL-LAW': 'risk_management',          // Law enforcement
    'OBL-MIG': 'deployer_obligations',     // Migration
    'OBL-JUS': 'risk_management',          // Justice
    'OBL-INF': 'risk_management',          // Critical infrastructure
    'OBL-AV':  'risk_management',          // Aviation/safety
    'OBL-BIO': 'human_oversight',          // Biometrics
    'OBL-GEN': 'deployer_obligations',     // General
    'OBL-MKT': 'transparency',             // Marketing
    'OBL-CSR': 'post_market_monitoring',   // Cross-sector reporting
    'OBL-CS':  'post_market_monitoring',   // Cross-sector
  };

  try {
    const obls = await pool.query(
      'SELECT "obligationIdUnique", title, "articleReference" FROM "Obligation"',
    );

    let updated = 0;
    let unmapped = 0;

    for (const obl of obls.rows) {
      // Extract ID after eu-ai-act- prefix
      const raw = obl.obligationIdUnique.replace('eu-ai-act-', '');

      // Try exact numeric match first: OBL-003a → OBL-003
      const numMatch = raw.match(/^(OBL-\d+)/);
      let category = numMatch ? mapping[numMatch[1]] : null;

      // Try sector prefix match: OBL-HR-002 → OBL-HR
      if (!category) {
        const sectorMatch = raw.match(/^(OBL-[A-Z]+)/);
        if (sectorMatch) category = sectorMapping[sectorMatch[1]];
      }

      if (!category) {
        console.log('  UNMAPPED:', obl.obligationIdUnique, '-', obl.title);
        unmapped++;
        continue;
      }

      await pool.query(
        'UPDATE "Obligation" SET category = $1 WHERE "obligationIdUnique" = $2',
        [category, obl.obligationIdUnique],
      );
      updated++;
    }

    console.log(`Updated ${updated} obligations with categories (${unmapped} unmapped)`);

    // Verify
    const cats = await pool.query(
      'SELECT category, COUNT(*) as cnt FROM "Obligation" GROUP BY category ORDER BY cnt DESC',
    );
    console.log('\nCategories:');
    for (const c of cats.rows) {
      console.log(`  ${c.category || 'NULL'}: ${c.cnt}`);
    }
  } finally {
    await pool.end();
  }
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
