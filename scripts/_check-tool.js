const { Client } = require('pg');
const slug = process.argv[2] || 'chatgpt';
const c = new Client({ connectionString: process.env.DATABASE_URL });

c.connect().then(async () => {
  const r = await c.query('SELECT name, "riskLevel", level, evidence, assessments FROM "RegistryTool" WHERE slug = $1', [slug]);
  const t = r.rows[0];
  console.log('Name:', t.name);
  console.log('Risk:', t.riskLevel);
  console.log('Level:', t.level);

  const ev = typeof t.evidence === 'string' ? JSON.parse(t.evidence) : (t.evidence || {});
  const ps = ev.passive_scan || {};
  console.log('\n=== PASSIVE SCAN ===');
  console.log('disclosure:', JSON.stringify(ps.disclosure));
  console.log('privacy:', JSON.stringify(ps.privacy_policy));
  console.log('trust:', JSON.stringify(ps.trust));
  console.log('model_card:', JSON.stringify(ps.model_card));
  console.log('web_search:', JSON.stringify(ps.web_search));
  console.log('content_marking:', JSON.stringify(ps.content_marking));

  const a = typeof t.assessments === 'string' ? JSON.parse(t.assessments) : (t.assessments || {});
  const eu = a['eu-ai-act'] || {};
  console.log('\n=== SCORING ===');
  console.log('score:', eu.score);
  console.log('coverage:', eu.coverage);
  console.log('transparencyGrade:', eu.transparencyGrade);

  const scoring = eu.scoring || {};
  const details = scoring.obligationDetails || {};
  const statuses = {};
  for (const [id, d] of Object.entries(details)) {
    const s = d.status || 'unknown';
    statuses[s] = (statuses[s] || 0) + 1;
  }
  console.log('\nObligation statuses:', JSON.stringify(statuses));
  console.log('Total obligations:', Object.keys(details).length);

  console.log('\n=== ASSESSED OBLIGATIONS ===');
  for (const [id, d] of Object.entries(details)) {
    if (d.status !== 'unknown') {
      console.log(`  ${id} -> ${d.status} | base: ${d.baseScore} | weighted: ${d.weightedScore}/${d.maxWeightedScore}`);
    }
  }

  console.log('\n=== TRANSPARENCY SIGNALS ===');
  const disc = ps.disclosure || {};
  const trust = ps.trust || {};
  const priv = ps.privacy_policy || {};
  const ws = ps.web_search || {};
  const mc = ps.model_card || {};
  const cm = ps.content_marking || {};
  console.log('  disclosure.visible:', disc.visible, '(+15)');
  console.log('  privacy.mentions_ai && mentions_eu:', priv.mentions_ai, '&&', priv.mentions_eu, '(+10)');
  const mcSections = [mc.has_limitations, mc.has_bias_info, mc.has_training_data, mc.has_evaluation].filter(Boolean).length;
  console.log('  model_card.has_model_card:', mc.has_model_card, '| sections:', mcSections, '/4 (need 3) (+15)');
  console.log('  trust.has_responsible_ai_page:', trust.has_responsible_ai_page, '(+10)');
  console.log('  trust.has_eu_ai_act_page:', trust.has_eu_ai_act_page, '(+15)');
  console.log('  web_search.has_transparency_report:', ws.has_transparency_report, '(+10)');
  console.log('  content_marking.c2pa || watermark:', cm.c2pa, '||', cm.watermark, '(+10)');
  console.log('  web_search.has_public_bias_audit:', ws.has_public_bias_audit, '(+10)');
  console.log('  trust.certifications ISO 42001:', (trust.certifications || []).includes('ISO 42001'), '(+5)');

  await c.end();
});
