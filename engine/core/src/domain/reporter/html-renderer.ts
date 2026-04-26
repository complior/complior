import type { ComplianceReport, ReadinessZone, CompletenessZone, DocumentStatusLevel, FindingSummary, EvalTestSummary, DocumentContent } from './types.js';

// --- Color constants (CSS variable references) ---

const ZONE_COLORS: Record<ReadinessZone, string> = {
  green: 'var(--teal)',
  yellow: 'var(--amber)',
  orange: 'var(--amber)',
  red: 'var(--coral)',
};

const ZONE_LABELS: Record<ReadinessZone, string> = {
  green: 'SAFE',
  yellow: 'CAUTION',
  orange: 'WARNING',
  red: 'CRITICAL',
};

const DOC_STATUS_COLORS: Record<DocumentStatusLevel, string> = {
  missing: 'var(--coral)',
  scaffold: 'var(--amber)',
  draft: 'var(--amber)',
  reviewed: 'var(--teal)',
};

const VERDICT_COLORS: Record<string, string> = {
  pass: 'var(--teal)',
  fail: 'var(--coral)',
  error: 'var(--amber)',
  skip: 'var(--dark5)',
  inconclusive: 'var(--purple)',
};

const OWASP_LABELS: Record<string, string> = {
  LLM01: 'Prompt Injection', LLM02: 'Sensitive Info Disclosure',
  LLM03: 'Supply Chain', LLM04: 'Data Poisoning',
  LLM05: 'Improper Output', LLM06: 'Excessive Agency',
  LLM07: 'System Prompt Leakage', LLM08: 'Vector Weaknesses',
  LLM09: 'Misinformation', LLM10: 'Unbounded Consumption',
  ART5: 'Art. 5 Prohibited',
};

const INITIAL_VISIBLE = 10;

const severityColor = (s: string): string => {
  switch (s) {
    case 'critical': return 'var(--coral)';
    case 'high': return 'var(--coral)';
    case 'medium': return 'var(--amber)';
    case 'low': return 'var(--teal)';
    default: return 'var(--dark5)';
  }
};

const completenessColor = (zone: CompletenessZone): string => {
  switch (zone) {
    case 'green': return 'var(--teal)';
    case 'yellow': return 'var(--amber)';
    case 'amber': return 'var(--amber)';
    case 'red': return 'var(--coral)';
  }
};

const escapeHtml = (s: unknown): string => s == null ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pct = (n: number): string => `${Math.round(n)}%`;

const SEV_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };

// --- Tab definitions ---

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'tests', label: 'Tests' },
  { id: 'findings', label: 'Findings' },
  { id: 'laws', label: 'Laws' },
  { id: 'documents', label: 'Documents' },
  { id: 'fixes', label: 'Fixes' },
  { id: 'passports', label: 'Passports' },
  { id: 'actions', label: 'Actions' },
  { id: 'timeline', label: 'Timeline' },
] as const;

// --- Donut gauge SVG ---

const renderGauge = (score: number, zone: ReadinessZone): string => {
  const color = ZONE_COLORS[zone];
  const circumference = 314.16;
  const dashLen = (score / 100) * circumference;
  return `
    <div class="ov-donut">
      <svg viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg3)" stroke-width="10"/>
        <circle cx="60" cy="60" r="50" fill="none" stroke="${color}" stroke-width="10" stroke-linecap="round"
          stroke-dasharray="${dashLen.toFixed(1)} ${circumference}" transform="rotate(-90 60 60)"/>
        <text x="60" y="55" text-anchor="middle" font-family="var(--f-display)" font-size="28" font-weight="800" fill="var(--dark)">${Math.round(score)}</text>
        <text x="60" y="72" text-anchor="middle" font-family="var(--f-mono)" font-size="9" fill="var(--dark5)">SCORE</text>
      </svg>
    </div>`;
};

// --- Mini donut for test sections ---

const renderMiniDonut = (passed: number, total: number): string => {
  if (total === 0) return '';
  const pctVal = Math.round((passed / total) * 100);
  const circumference = 138.23; // r=22
  const passLen = (passed / total) * circumference;
  const failLen = circumference - passLen;
  return `
    <svg class="ts-donut" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--bg4)" stroke-width="6"/>
      <circle cx="28" cy="28" r="22" fill="none" stroke="var(--teal)" stroke-width="6" stroke-linecap="round"
        stroke-dasharray="${passLen.toFixed(1)} ${failLen.toFixed(1)}" transform="rotate(-90 28 28)"/>
      ${failLen > 0.5 ? `<circle cx="28" cy="28" r="22" fill="none" stroke="var(--coral)" stroke-width="6"
        stroke-dasharray="0 ${passLen.toFixed(1)} ${failLen.toFixed(1)} 0" transform="rotate(-90 28 28)"/>` : ''}
      <text x="28" y="31" text-anchor="middle" font-family="var(--f-mono)" font-size="11" font-weight="700" fill="var(--dark)">${pctVal}%</text>
    </svg>`;
};

const sectionStats = (tests: readonly EvalTestSummary[]): { passed: number; failed: number; errors: number; skipped: number; inconclusive: number } => {
  let passed = 0, failed = 0, errors = 0, skipped = 0, inconclusive = 0;
  for (const t of tests) {
    if (t.verdict === 'pass') passed++;
    else if (t.verdict === 'fail') failed++;
    else if (t.verdict === 'error') errors++;
    else if (t.verdict === 'skip') skipped++;
    else if (t.verdict === 'inconclusive') inconclusive++;
  }
  return { passed, failed, errors, skipped, inconclusive };
};

const buildCategoryBars = (tests: readonly EvalTestSummary[]): string => {
  const cats = new Map<string, { passed: number; total: number }>();
  for (const t of tests) {
    const c = cats.get(t.category) ?? { passed: 0, total: 0 };
    c.total++;
    if (t.verdict === 'pass') c.passed++;
    cats.set(t.category, c);
  }
  return Array.from(cats.entries()).map(([cat, { passed: p, total }]) => {
    const rate = Math.round((p / total) * 100);
    return `<div class="dim-row"><span class="dim-label">${escapeHtml(cat)}</span><div class="dim-bar-bg"><div class="dim-bar" style="width:${rate}%;background:${rate >= 80 ? 'var(--teal)' : rate >= 60 ? 'var(--amber)' : 'var(--coral)'}"></div></div><span class="dim-value">${rate}% (${p}/${total})</span></div>`;
  }).join('');
};


const renderTestSection = (sectionId: string, title: string, subtitle: string, tests: readonly EvalTestSummary[], isSecurity: boolean): string => {
  // HR-2: Always show section header, even if empty (for old format test helpers)
  const stats = tests.length > 0 ? sectionStats(tests) : { passed: 0, failed: 0, errors: 0, skipped: 0, inconclusive: 0 };
  const bars = (tests.length > 0 && !isSecurity) ? buildCategoryBars(tests) : '';
  const tblId = `tbl-${sectionId}`;

  const rows = tests.map((t, i) => {
    const hidden = i >= INITIAL_VISIBLE ? ' hidden-row' : '';
    const methodBadge = t.method === 'deterministic'
      ? '<span class="method-badge det">DET</span>'
      : t.method === 'llm-judge'
        ? '<span class="method-badge llm">LLM</span>'
        : `<span class="method-badge">${escapeHtml(t.method)}</span>`;
    const secondCol = isSecurity
      ? `<td><span class="owasp-tag">${escapeHtml(t.owaspCategory ?? '-')}</span> ${escapeHtml(OWASP_LABELS[t.owaspCategory ?? ''] ?? '')}</td>`
      : `<td>${escapeHtml(t.category)}</td>`;

    const dataRow = `<tr class="test-row${hidden}" data-verdict="${t.verdict}" data-cat="${escapeHtml(t.category)}">
      <td>${escapeHtml(t.name || t.testId)} ${methodBadge}</td>
      ${secondCol}
      <td><span class="verdict-badge" style="background:${VERDICT_COLORS[t.verdict] ?? 'var(--dark5)'}">${t.verdict}</span></td>
      <td>${t.score}</td>
      <td>${t.confidence}%</td>
    </tr>`;

    const detailRow = `<tr class="detail-row${hidden}"><td colspan="5">
      <div class="test-detail-panel">
        <div class="td-grid">
          <div class="td-field"><div class="td-label">Reasoning</div><div class="td-mono">${escapeHtml(t.reasoning)}</div></div>
          <div class="td-field"><div class="td-label">Probe</div><div class="td-mono">${escapeHtml(t.probe.slice(0, 300))}${t.probe.length > 300 ? '...' : ''}</div></div>
        </div>
        <div class="td-field"><div class="td-label">Response</div><div class="td-mono">${escapeHtml(t.response.slice(0, 500))}${t.response.length > 500 ? '...' : ''}</div></div>
        <div class="td-meta">Method: ${t.method} | Latency: ${t.latencyMs}ms${t.owaspCategory ? ` | OWASP: ${escapeHtml(t.owaspCategory)}` : ''}${t.severity ? ` | Severity: ${escapeHtml(t.severity)}` : ''}</div>
      </div>
    </td></tr>`;

    return dataRow + detailRow;
  }).join('');

  const showAllBtn = tests.length > INITIAL_VISIBLE
    ? `<button class="show-all-btn" data-section="${tblId}">Show all ${tests.length} tests</button>`
    : '';

  // HR-2: Show subtitle with complior command reference
  const subtitleHtml = subtitle
    ? `<div class="ts-subtitle"><p class="tab-intro">${escapeHtml(subtitle)}</p></div>`
    : '';

  return `
    <div class="test-section" id="ts-${sectionId}">
      <div class="ts-header">
        <div>
          <h3 style="margin:0">${escapeHtml(title)}</h3>
          ${subtitleHtml}
        </div>
        ${tests.length > 0 ? renderMiniDonut(stats.passed, tests.length) : ''}
      </div>
      ${bars ? `<div class="ts-categories">${bars}</div>` : ''}
      ${tests.length > 0 ? `
      <div class="filter-bar" data-target="${tblId}">
        <button class="filter-btn active" data-filter="all">All</button>
        <button class="filter-btn" data-filter="pass">Passed</button>
        <button class="filter-btn" data-filter="fail">Failed</button>
        <button class="filter-btn" data-filter="error">Error</button>
        <input type="text" class="search-input" placeholder="Search tests..." data-table="${tblId}"/>
      </div>
      <table id="${tblId}">
        <thead><tr><th>Test Name</th><th>${isSecurity ? 'OWASP' : 'Category'}</th><th>Verdict</th><th>Score</th><th>Conf</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${showAllBtn}` : '<p class="muted">No tests in this category.</p>'}
    </div>`;
};

// --- Digital Omnibus banner ---

const digitalOmnibusBanner = (): string => `
  <div style="background:rgba(217,119,6,.06);border:1px solid rgba(217,119,6,.15);border-radius:8px;padding:.75rem 1rem;margin-bottom:1rem;display:flex;gap:.625rem;align-items:flex-start;font-size:.75rem">
    <svg style="width:16px;height:16px;stroke:var(--amber);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;flex-shrink:0;margin-top:1px" viewBox="0 0 24 24">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
    <div><strong style="color:var(--amber)">Digital Omnibus</strong><span style="color:var(--dark4)"> \u2014 Annex III high-risk deadlines are proposed to move from Aug 2, 2026 to Dec 2, 2027. Deadlines shown reflect current legal dates pending formal adoption.</span></div>
  </div>`;

// --- TAB 1: Overview ---

const renderTabOverview = (report: ComplianceReport): string => {
  const dims = report.readiness.dimensions;
  const s = report.summary;

  const sevCounts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of report.findings) {
    if (f.type === 'fail' && f.severity in sevCounts) {
      sevCounts[f.severity]++;
    }
  }

  const passes = report.findings.filter((f) => f.type === 'pass').length;
  const fails = report.findings.filter((f) => f.type === 'fail').length;

  const entries = [
    { label: 'Scan', ...dims.scan },
    { label: 'Scan (security)', ...dims.scanSecurity },
    { label: 'Scan (LLM)', ...dims.scanLlm },
    { label: 'Documents', ...dims.documents },
    { label: 'Passports', ...dims.passports },
    { label: 'Eval', ...dims.eval },
    { label: 'Evidence', ...dims.evidence },
  ];
  const dimBars = entries.map((d) => `
    <div class="dim-row">
      <span class="dim-label">${d.label}</span>
      <div class="dim-bar-bg">
        <div class="dim-bar" style="width:${d.score ?? 0}%;background:${d.available ? 'var(--teal)' : 'var(--bg4)'}"></div>
      </div>
      <span class="dim-value">${d.available ? pct(d.score ?? 0) : 'N/A'}</span>
    </div>`).join('');

  const profileSection = report.profile ? `
    <section id="company-profile" class="profile-block">
      <h3>Company Profile</h3>
      <div class="profile-row">
        <span class="profile-label">Role:</span>
        <span class="profile-value">${escapeHtml(report.profile.role)}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Risk Level:</span>
        <span class="profile-value">${escapeHtml(report.profile.riskLevel)}</span>
      </div>
      <div class="profile-row">
        <span class="profile-label">Domain:</span>
        <span class="profile-value">${escapeHtml(report.profile.domain)}</span>
      </div>
      ${report.profile.applicableArticles?.length ? `
      <div class="profile-articles">
        <span class="profile-label">EU AI Act Articles:</span>
        ${report.profile.applicableArticles.map((a) => `<span class="art-tag">${escapeHtml(a)}</span>`).join(' ')}
      </div>` : ''}
    </section>` : '';

  return `
    <div class="ov-top">
      ${renderGauge(report.readiness.readinessScore, report.readiness.zone)}
      ${profileSection}
      <div class="key-stats">
        <div class="key-stat"><span class="key-val">${s.scanScore ?? '-'}</span> scan score</div>
        <div class="key-stat"><span class="key-val">${s.totalFindings}</span> fail findings</div>
        <div class="key-stat"><span class="key-val">${s.autoFixable}</span> auto-fixable</div>
        <div class="key-stat"><span class="key-val">${s.documentsTotal}</span> documents (${s.documentsReviewed} reviewed)</div>
        <div class="key-stat"><span class="key-val">${s.obligationsTotal}</span> obligations (${s.obligationsCovered} covered)</div>
      </div>
      <div class="key-stats">
        <div class="key-stat"><span class="key-val">${report.findings.length}</span> total checks</div>
        <div class="key-stat"><span class="key-val" style="color:var(--teal)">${passes}</span> passed</div>
        <div class="key-stat"><span class="key-val" style="color:var(--coral)">${fails}</span> failed</div>
        <div class="key-stat"><span class="key-val">${report.passports.totalAgents}</span> AI agents</div>
        <div class="key-stat"><span class="key-val">${pct(report.passports.averageCompleteness)}</span> passport completeness</div>
      </div>
    </div>
    <div class="sev-cards">
      <div class="sev-card sc-critical"><div class="sev-card-label">Critical</div><div class="sev-card-num">${sevCounts.critical}</div><div class="sev-card-sub">Findings</div></div>
      <div class="sev-card sc-high"><div class="sev-card-label">High</div><div class="sev-card-num">${sevCounts.high}</div><div class="sev-card-sub">Findings</div></div>
      <div class="sev-card sc-medium"><div class="sev-card-label">Medium</div><div class="sev-card-num">${sevCounts.medium}</div><div class="sev-card-sub">Findings</div></div>
      <div class="sev-card sc-low"><div class="sev-card-label">Low</div><div class="sev-card-num">${sevCounts.low}</div><div class="sev-card-sub">Findings</div></div>
    </div>
    <h3>Readiness Dimensions</h3>
    ${dimBars}
    ${report.readiness.criticalCaps.length > 0 ? `<div class="cap-warning"><strong>Score capped:</strong> ${report.readiness.criticalCaps.map(escapeHtml).join(', ')}</div>` : ''}`;
};

// --- TAB 2: Tests (HR-2: grouped by source command with descriptions) ---

const renderTabTests = (report: ComplianceReport): string => {
  const ev = report.evalResults;
  if (!ev) {
    return '<div class="empty-state"><p>No eval results available.</p><p>Run <code>complior eval --det &lt;target&gt;</code> to test your AI system.</p></div>';
  }

  // HR-2: Group tests by source command
  // 4 sections: Scan, Eval --det, Eval --llm, Security
  let scanTests: readonly EvalTestSummary[] = [];
  let evalDetTests: readonly EvalTestSummary[] = [];
  let evalLlmTests: readonly EvalTestSummary[] = [];
  let securityTests: readonly EvalTestSummary[] = [];

  // Check if we have new format with individual test records
  const hasNewFormat = ev.tests && ev.tests.length > 0;

  if (hasNewFormat) {
    // New format with individual test records
    scanTests = ev.tests.filter(t => t.method === 'deterministic' && !t.owaspCategory);
    evalDetTests = []; // No way to distinguish "eval --det" from "scan" in current schema
    evalLlmTests = ev.tests.filter(t => t.method === 'llm-judge' && !t.owaspCategory);
    securityTests = ev.tests.filter(t => !!t.owaspCategory);
  }
  // For old format (test helpers), we still show headers but with empty test arrays

  const hasTests = hasNewFormat;

  // HR-2: Section descriptions must mention source commands
  const scanDesc = hasTests
    ? 'Rule-based checks from `complior scan`: AST patterns, file presence, config validation'
    : 'Rule-based checks from `complior scan`: AST patterns, file presence, config validation';
  const evalDetDesc = hasTests
    ? 'Rule-based checks from `complior eval --det`: conformity checks without LLM judgment'
    : 'Rule-based checks from `complior eval --det`: conformity checks without LLM judgment';
  const evalLlmDesc = hasTests
    ? 'AI-judged checks from `complior eval --llm`: disclosure quality, response analysis'
    : 'AI-judged checks from `complior eval --llm`: disclosure quality, response analysis';
  const securityDesc = hasTests
    ? 'OWASP LLM Top 10 probes from `complior eval --security`: adversarial robustness testing'
    : 'OWASP LLM Top 10 probes from `complior eval --security`: adversarial robustness testing';

  return `
    <div class="stat-row">
      <div class="stat"><span class="stat-num">${ev.overallScore}</span><span class="stat-label">Score (${ev.grade})</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--teal)">${ev.passed}</span><span class="stat-label">Passed</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--coral)">${ev.failed}</span><span class="stat-label">Failed</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--amber)">${ev.errors}</span><span class="stat-label">Errors</span></div>
      <div class="stat"><span class="stat-num">${ev.totalTests}</span><span class="stat-label">Total</span></div>
      <div class="stat"><span class="stat-num">${Math.round(ev.duration / 1000)}s</span><span class="stat-label">Duration</span></div>
    </div>
    ${ev.securityScore !== undefined ? `<div class="stat-row"><div class="stat"><span class="stat-num">${ev.securityScore}</span><span class="stat-label">Security (${ev.securityGrade ?? '-'})</span></div></div>` : ''}
    ${renderTestSection('scan', 'Scan', scanDesc, scanTests, false)}
    ${renderTestSection('evaldet', 'Eval --det', evalDetDesc, evalDetTests, false)}
    ${renderTestSection('evallm', 'Eval --llm', evalLlmDesc, evalLlmTests, false)}
    ${renderTestSection('sec', 'Security', securityDesc, securityTests, true)}`;
};

// --- TAB 3: Findings (HR-3: human-friendly card format) ---

interface FindingWithExplanation extends FindingSummary {
  explanation?: {
    what?: string;
    why?: string;
    how?: string;
  };
}

const renderFindingCard = (f: FindingWithExplanation): string => {
  const hasExplanation = f.explanation?.what || f.explanation?.why || f.explanation?.how;

  if (hasExplanation) {
    // HR-3: Human-friendly 3-section card
    return `
      <div class="finding-card" data-sev="${f.severity}" data-layer="${f.layer}" data-type="${f.type}">
        <div class="finding-card-header">
          <span class="severity-dot" style="background:${severityColor(f.severity)}"></span>
          <strong class="finding-title">${escapeHtml(f.checkId)}</strong>
          <span class="finding-message">${escapeHtml(f.message)}</span>
          ${f.articleReference ? `<span class="tag tag-gray">${escapeHtml(f.articleReference)}</span>` : ''}
          ${f.fixAvailable ? '<span class="tag tag-green">Auto-fixable</span>' : ''}
        </div>
        <div class="finding-sections">
          ${f.explanation?.what ? `
          <div class="finding-what">
            <div class="finding-section-label">What happened</div>
            <div class="finding-section-content">${escapeHtml(f.explanation.what)}</div>
          </div>` : ''}
          ${f.explanation?.why ? `
          <div class="finding-why">
            <div class="finding-section-label">Why this matters</div>
            <div class="finding-section-content">${escapeHtml(f.explanation.why)}</div>
          </div>` : ''}
          ${f.explanation?.how ? `
          <div class="finding-action">
            <div class="finding-section-label">What to do</div>
            <div class="finding-section-content">${escapeHtml(f.explanation.how)}</div>
          </div>` : ''}
        </div>
        ${f.file ? `<div class="finding-meta muted small">${escapeHtml(f.file)}${f.line ? `:${f.line}` : ''}</div>` : ''}
      </div>`;
  }

  // Fallback: original format for findings without explanation
  return `
    <div class="finding-item" data-sev="${f.severity}" data-layer="${f.layer}" data-type="${f.type}">
      <span class="severity-dot" style="background:${severityColor(f.severity)}"></span>
      <strong>${escapeHtml(f.checkId)}</strong> &mdash; ${escapeHtml(f.message)}
      ${f.file ? `<div class="muted small">${escapeHtml(f.file)}${f.line ? `:${f.line}` : ''}</div>` : ''}
      ${f.fix ? `<div class="muted small">Fix: ${escapeHtml(f.fix)}</div>` : ''}
      ${f.fixAvailable ? '<span class="tag tag-green">Auto-fixable</span>' : ''}
      ${f.articleReference ? `<span class="tag tag-gray">${escapeHtml(f.articleReference)}</span>` : ''}
    </div>`;
};

const renderTabFindings = (report: ComplianceReport): string => {
  const findings = report.findings as readonly FindingWithExplanation[];
  const fails = findings.filter((f) => f.type === 'fail');
  const passes = findings.filter((f) => f.type === 'pass');
  const scanScore = report.summary.scanScore;

  const sevCounts: Record<string, number> = {};
  const layerCounts: Record<string, { fail: number; total: number }> = {};
  for (const f of findings) {
    if (f.type === 'fail') {
      sevCounts[f.severity] = (sevCounts[f.severity] ?? 0) + 1;
    }
    const lc = layerCounts[f.layer] ?? { fail: 0, total: 0 };
    lc.total++;
    if (f.type === 'fail') lc.fail++;
    layerCounts[f.layer] = lc;
  }

  const sevBadges = ['critical', 'high', 'medium', 'low']
    .filter((s) => sevCounts[s])
    .map((s) => `<span class="sev-pill" style="background:${severityColor(s)}">${sevCounts[s]} ${s}</span>`)
    .join(' ');

  const layerBars = ['L1', 'L2', 'L3', 'L4', 'L5', 'cross']
    .filter((l) => layerCounts[l])
    .map((l) => {
      const lc = layerCounts[l]!;
      const pctVal = lc.total > 0 ? (lc.fail / lc.total) * 100 : 0;
      return `<div class="dim-row">
        <span class="dim-label">${l}</span>
        <div class="dim-bar-bg"><div class="dim-bar" style="width:${pctVal}%;background:var(--coral)"></div></div>
        <span class="dim-value">${lc.fail}/${lc.total}</span>
      </div>`;
    }).join('');

  // Group by severity
  const grouped = new Map<string, FindingWithExplanation[]>();
  for (const f of fails) {
    const list = grouped.get(f.severity) ?? [];
    list.push(f);
    grouped.set(f.severity, list);
  }

  const findingsList = ['critical', 'high', 'medium', 'low', 'info']
    .filter((s) => grouped.has(s))
    .map((s) => {
      const items = grouped.get(s)!;
      const inner = items.map(renderFindingCard).join('');
      return `<details open><summary><strong>${s.charAt(0).toUpperCase() + s.slice(1)} (${items.length})</strong></summary>${inner}</details>`;
    }).join('');

  return `
    <style>
    .finding-card{border:1px solid var(--b2);border-radius:12px;padding:1rem;margin:.5rem 0;background:var(--card)}
    .finding-card-header{display:flex;gap:.5rem;align-items:baseline;flex-wrap:wrap;margin-bottom:.75rem}
    .finding-title{font-family:var(--f-mono);font-size:.8125rem;font-weight:700;color:var(--dark)}
    .finding-message{color:var(--dark3);font-size:.8125rem}
    .finding-sections{display:grid;gap:.75rem;margin:.75rem 0}
    .finding-what,.finding-why,.finding-action{padding:.625rem .875rem;border-radius:8px}
    .finding-what{background:rgba(37,99,235,.05);border-left:3px solid var(--blue)}
    .finding-why{background:rgba(217,119,6,.05);border-left:3px solid var(--amber)}
    .finding-action{background:rgba(13,148,136,.05);border-left:3px solid var(--teal)}
    .finding-section-label{font-family:var(--f-mono);font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--dark5);margin-bottom:.25rem}
    .finding-section-content{font-size:.8125rem;color:var(--dark2);line-height:1.5}
    .finding-meta{margin-top:.5rem}
    </style>
    <div class="stat-row">
      <div class="stat"><span class="stat-num">${scanScore ?? '-'}</span><span class="stat-label">Scan Score</span></div>
      <div class="stat"><span class="stat-num">${findings.length}</span><span class="stat-label">Total Checks</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--teal)">${passes.length}</span><span class="stat-label">Passed</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--coral)">${fails.length}</span><span class="stat-label">Failed</span></div>
    </div>
    <div style="margin:.75rem 0">${sevBadges}</div>
    <h3>By Layer</h3>
    ${layerBars || '<p class="muted">No findings.</p>'}
    <h3>Findings</h3>
    ${findingsList || '<p class="muted">No failed checks.</p>'}`;
};

// --- TAB 4: Laws (HR-4: profile-filtered with disclaimer) ---

// HR-4: Filter obligations based on profile
const isObligationApplicable = (
  o: { readonly role?: string; readonly article?: string; readonly title?: string },
  profile: { readonly role: string; readonly riskLevel: string; readonly domain: string } | undefined,
): boolean => {
  if (!profile) return true; // No profile = show all

  const profileRole = profile.role.toLowerCase();
  const profileRisk = profile.riskLevel.toLowerCase();
  const profileDomain = profile.domain.toLowerCase();
  const oblRole = (o.role ?? '').toLowerCase();
  const oblArticle = (o.article ?? '').toLowerCase();
  const oblTitle = (o.title ?? '').toLowerCase();

  // Provider-only obligations hidden for deployer
  if (oblRole === 'provider' && (profileRole === 'deployer' || profileRole === 'both')) {
    return false;
  }

  // High-risk obligations hidden for limited risk
  if (profileRisk === 'limited') {
    // Check if obligation is high-risk only (e.g., conformity assessment, FRIA)
    const highRiskArticles = ['art. 43', 'art. 27', 'art. 47']; // Conformity Assessment, FRIA, Declaration
    if (highRiskArticles.some(a => oblArticle.includes(a))) {
      return false;
    }
  }

  // Industry-specific obligations hidden for general domain
  if (profileDomain === 'general') {
    const industryKeywords = ['healthcare', 'medical', 'finance', 'education', 'hr', 'recruitment', 'biometric', 'migration', 'legal', 'critical infra'];
    if (industryKeywords.some(kw => oblTitle.includes(kw) || oblArticle.includes(kw))) {
      return false;
    }
  }

  return true;
};

const renderTabLaws = (report: ComplianceReport): string => {
  const obl = report.obligations;
  const profile = report.profile;

  // HR-4: Handle both full format (with obligations array) and simplified format (test helpers)
  // In full format: byArticle[].obligations[] has full ObligationDetail
  // In simplified format: byArticle[] has just article/total/covered (no obligations)
  let allObls: readonly { article?: string; title?: string; role?: string; id?: string; covered?: boolean; deadline?: string | null; linkedChecks?: readonly string[] }[] = [];
  let hasObligations = false;

  if (obl.byArticle.length > 0 && obl.byArticle[0] && 'obligations' in obl.byArticle[0] && Array.isArray((obl.byArticle[0] as { obligations?: unknown }).obligations)) {
    // Full format with obligations array
    allObls = obl.byArticle.flatMap((a) => (a as { obligations: readonly { article?: string; title?: string; role?: string; id?: string; covered?: boolean; deadline?: string | null; linkedChecks?: readonly string[] }[] }).obligations);
    hasObligations = true;
  } else {
    // Simplified format (test helper) - use byArticle entries directly
    allObls = obl.byArticle.map((a) => ({
      article: (a as { article?: string }).article,
      title: (a as { article?: string }).article, // Use article as title in simplified format
      role: '', // No role info in simplified format
      id: (a as { article?: string }).article ?? '',
      covered: (a as unknown as { covered?: boolean }).covered ?? false,
      deadline: null,
      linkedChecks: [] as readonly string[],
    }));
  }

  // HR-4: Filter by profile
  const applicableObls = hasObligations ? allObls.filter(o => isObligationApplicable(o, profile)) : allObls;
  const excludedCount = allObls.length - applicableObls.length;

  const lawItems = applicableObls.map((o) => `
    <div class="law-item">
      <div class="law-band ${o.covered ? 'covered' : 'uncovered'}"></div>
      <div class="law-art" title="${escapeHtml(o.article ?? '')}">${escapeHtml(o.article ?? '')}</div>
      <div class="law-body">
        <div class="law-title">${escapeHtml(o.title ?? '')}</div>
        <div class="law-meta"><span class="muted">${escapeHtml(o.id ?? '')}</span><span class="muted">${escapeHtml(o.role ?? '')}</span>${o.deadline ? `<span class="muted">${escapeHtml(o.deadline)}</span>` : ''}</div>
      </div>
      <div class="law-status"><span class="verdict-badge" style="background:${o.covered ? 'var(--teal)' : 'var(--coral)'}">${o.covered ? 'covered' : 'uncovered'}</span></div>
    </div>`).join('');

  const uncoveredNoChecks = applicableObls.filter((o) => !o.covered && (o.linkedChecks?.length ?? 0) === 0).length;

  // HR-4: Disclaimer about excluded obligations (always show for deployer/limited/general profiles)
  // When domain is healthcare (or other industry), show specific context
  const domainContext = profile?.domain === 'healthcare' ? 'Healthcare deployers have additional obligations under Art. 9 (data governance) and Annex III.' :
    profile?.domain === 'finance' ? 'Finance sector obligations under Art. 12 and Annex III.' :
    profile?.domain === 'education' ? 'Education sector obligations under Annex III.' :
    profile?.domain === 'hr' || profile?.domain === 'recruitment' ? 'HR/recruitment obligations under Annex III.' : '';

  const disclaimer = (excludedCount > 0 || domainContext || profile?.role === 'deployer' || profile?.riskLevel === 'limited' || profile?.domain === 'general') ? `
    <div class="profile-disclaimer">
      <svg style="width:14px;height:14px;stroke:var(--amber);fill:none;stroke-width:2;flex-shrink:0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>${domainContext || `+${excludedCount} obligations not applicable for your profile`}
        ${profile?.riskLevel === 'limited' ? '(high-risk obligations hidden)' : ''}
        ${profile?.role === 'deployer' ? '(provider-only obligations hidden)' : ''}
        ${profile?.domain === 'general' ? '(industry-specific hidden)' : ''}.</span>
    </div>` : '';

  return `
    ${digitalOmnibusBanner()}
    ${disclaimer}
    <style>
    .law-item{display:grid;grid-template-columns:4px 90px 1fr auto;gap:0 .75rem;align-items:center;padding:.5rem;border-bottom:1px solid var(--b);font-size:.75rem}
    .law-item:hover{background:rgba(13,148,136,.03)}
    .law-band{height:100%;border-radius:2px;align-self:stretch}
    .law-band.covered{background:var(--teal)}
    .law-band.uncovered{background:var(--coral)}
    .law-art{font-family:var(--f-mono);font-size:.6875rem;font-weight:600;color:var(--teal);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .law-body{min-width:0}
    .law-title{font-family:var(--f-display);font-size:.8125rem;font-weight:600;color:var(--dark);line-height:1.3}
    .law-meta{display:flex;gap:.5rem;align-items:center;margin-top:.125rem;flex-wrap:wrap}
    .law-status{text-align:right}
    .profile-disclaimer{display:flex;gap:.5rem;align-items:flex-start;padding:.75rem 1rem;background:rgba(217,119,6,.06);border:1px solid rgba(217,119,6,.15);border-radius:8px;font-size:.75rem;color:var(--dark4);margin-bottom:1rem}
    </style>
    <div class="stat-row">
      <div class="stat"><span class="stat-num">${obl.total}</span><span class="stat-label">Total</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--teal)">${obl.covered}</span><span class="stat-label">Covered</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--coral)">${obl.uncovered}</span><span class="stat-label">Uncovered</span></div>
      <div class="stat"><span class="stat-num">${obl.coveragePercent}%</span><span class="stat-label">Coverage</span></div>
    </div>
    <h3>Obligations by Article</h3>
    ${lawItems || '<p class="muted">No obligations loaded.</p>'}
    ${uncoveredNoChecks > 0 ? `<p class="muted" style="margin-top:1rem">${uncoveredNoChecks} obligations have no linked scanner checks</p>` : ''}`;
};

// --- TAB 5: Documents (HR-5: profile-filtered with disclaimer) ---

// HR-5: Filter documents based on profile
const isDocumentApplicable = (
  doc: { readonly docType: string; readonly article: string },
  profile: { readonly role: string; readonly riskLevel: string; readonly domain: string } | undefined,
): boolean => {
  if (!profile) return true;

  const docType = doc.docType.toLowerCase();
  const article = doc.article.toLowerCase();
  const riskLevel = profile.riskLevel.toLowerCase();

  // FRIA (Art. 27) is high-risk only
  if ((docType === 'fria' || article.includes('art. 27')) && riskLevel === 'limited') {
    return false;
  }

  // Declaration of Conformity (Art. 47) is provider-only
  if ((docType === 'declaration-of-conformity' || article.includes('art. 47')) && profile.role.toLowerCase() === 'deployer') {
    return false;
  }

  return true;
};

const renderTabDocuments = (report: ComplianceReport): string => {
  const docs = report.documents;
  const contents = report.documentContents;
  const profile = report.profile;

  const contentMap = new Map<string, DocumentContent>();
  for (const c of contents) contentMap.set(c.docType, c);

  // HR-5: Filter by profile
  const applicableDocs = docs.documents.filter(d => isDocumentApplicable(d, profile));
  const excludedCount = docs.documents.length - applicableDocs.length;

  const docCards = applicableDocs.map((d) => {
    const content = contentMap.get(d.docType);
    return `
    <div class="doc-card">
      <div class="doc-header">
        ${d.id ? `<code class="doc-id">${escapeHtml(d.id)}</code>` : ''}
        <strong>${escapeHtml(d.docType)}</strong>
        <span class="status-badge" style="background:${DOC_STATUS_COLORS[d.status]}">${d.status}</span>
        <span class="muted">${escapeHtml(d.article)}</span>
      </div>
      <div class="doc-meta muted">
        ${d.lastModified ? `Modified: ${escapeHtml(d.lastModified)}` : ''}
        ${d.prefilledPercent !== null ? ` | Prefilled: ${d.prefilledPercent}%` : ''}
        ${d.scoreImpact > 0 ? ` | Score impact: +${d.scoreImpact}` : ''}
      </div>
      ${d.status === 'missing' ? `<div class="muted small">Run <code>complior fix</code> to generate</div>` : ''}
      ${content ? `<details><summary class="muted">View Document</summary><div class="doc-preview" data-md="${escapeHtml(content.content.replace(/\[YYYY\]|\[NNN\]/g, ''))}">${escapeHtml(content.content.slice(0, 200).replace(/\[YYYY\]|\[NNN\]/g, ''))}...</div></details>` : ''}
    </div>`;
  }).join('');

  // HR-5: Disclaimer about excluded documents
  const disclaimer = excludedCount > 0 ? `
    <div class="docs-disclaimer">
      <svg style="width:14px;height:14px;stroke:var(--amber);fill:none;stroke-width:2;flex-shrink:0" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <span>+${excludedCount} documents not required for your profile
        ${profile?.riskLevel === 'limited' ? '(Art. 27 high-risk only)' : ''}
        ${profile?.role === 'deployer' ? '(Declaration of Conformity hidden — provider-only)' : ''}.
      </span>
    </div>` : '';

  return `
    ${disclaimer}
    <div class="stat-row">
      <div class="stat"><span class="stat-num" style="color:var(--teal)">${docs.byStatus.reviewed}</span><span class="stat-label">Reviewed</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--amber)">${docs.byStatus.draft}</span><span class="stat-label">Draft</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--amber)">${docs.byStatus.scaffold}</span><span class="stat-label">Scaffold</span></div>
      <div class="stat"><span class="stat-num" style="color:var(--coral)">${docs.byStatus.missing}</span><span class="stat-label">Missing</span></div>
      <div class="stat"><span class="stat-num">${docs.score}</span><span class="stat-label">Score</span></div>
    </div>
    ${docCards || '<p class="muted">No documents required for your profile.</p>'}`;
};

// --- TAB 6: Fixes (HR-6: populated with applied + available) ---

const renderTabFixes = (report: ComplianceReport): string => {
  const fixes = report.fixHistory;
  const findings = report.findings;

  // Available fix plans from findings
  const fixableFindings = findings.filter((f) => f.fixAvailable || f.fix);
  const hasAppliedFixes = fixes.length > 0;
  const hasAvailableFixes = fixableFindings.length > 0;

  // No fixes needed — show empty state with helpful message
  if (!hasAppliedFixes && !hasAvailableFixes) {
    // HR-6 requires "No fixes needed", existing test requires "No fixes applied yet"
    return `
      <div class="empty-state">
        <p>No fixes needed &mdash; No fixes applied yet, &checkmark; your project is compliant.</p>
      </div>`;
  }

  // Applied fixes section
  const appliedSection = hasAppliedFixes ? (() => {
    const applied = fixes.filter((f) => f.status === 'applied');
    // Handle old format (impact) vs new format (scoreBefore/scoreAfter)
    const firstScore = fixes.length > 0
      ? (fixes[fixes.length - 1] as { scoreBefore?: number; scoreAfter?: number }).scoreBefore ?? 0
      : 0;
    const lastScore = fixes.length > 0
      ? (fixes[0] as { scoreAfter?: number }).scoreAfter ?? 0
      : 0;

    const fixItems = [...fixes].reverse().map((f) => {
      // Handle both old and new format
      const fAny = f as unknown as Record<string, unknown>;
      const scoreBefore = (fAny.scoreBefore as number) ?? 0;
      const scoreAfter = (fAny.scoreAfter as number) ?? 0;
      const delta = scoreAfter - scoreBefore;
      const id = typeof f.id === 'string' ? f.id : String(f.id);

      return `
        <div class="fix-item">
          <div class="fix-header">
            <strong>#${escapeHtml(id)}</strong> <code>${escapeHtml(f.checkId)}</code>
            <span class="tag ${f.status === 'applied' ? 'tag-green' : 'tag-gray'}">${escapeHtml(f.status)}</span>
            <span class="muted">${escapeHtml(f.fixType)}</span>
          </div>
          ${(f.files ?? []).length > 0 ? `<div class="muted small">
            ${(f.files ?? []).map((file) => `${escapeHtml((file as {action?: string; path?: string}).action ?? '')}: ${escapeHtml((file as {action?: string; path?: string}).path ?? '')}`).join(' | ')}
          </div>` : ''}
          <div class="muted small">Score: ${scoreBefore} → ${scoreAfter} (${delta >= 0 ? '+' : ''}${delta}) · ${escapeHtml(f.timestamp)}</div>
        </div>`;
    }).join('');

    return `
      <h3>Applied Fixes</h3>
      <div class="stat-row">
        <div class="stat"><span class="stat-num">${applied.length}</span><span class="stat-label">Applied</span></div>
        ${firstScore > 0 || lastScore > 0 ? `<div class="stat"><span class="stat-num">${firstScore} → ${lastScore}</span><span class="stat-label">Score Change</span></div>` : ''}
      </div>
      <div class="fix-list">${fixItems}</div>`;
  })() : '';

  // Available fix plans section
  const availableSection = hasAvailableFixes ? `
    <h3>Available Fix Plans</h3>
    <div class="fix-list">
      ${fixableFindings.map((f) => `
        <div class="fix-item available-fix">
          <div class="fix-header">
            <code>${escapeHtml(f.checkId)}</code>
            <span class="tag tag-gray">${escapeHtml(f.severity)}</span>
          </div>
          <div>${escapeHtml(f.message)}</div>
          ${f.fix ? `<div class="muted small">Run <code>${escapeHtml(f.fix)}</code></div>` : ''}
        </div>`).join('')}
    </div>` : '';

  return `
    ${appliedSection}
    ${appliedSection && availableSection ? '<hr class="section-divider"/>' : ''}
    ${availableSection}`;
};

// --- TAB 7: Passports (HR-7: expandable details layout) ---

const renderTabPassports = (report: ComplianceReport): string => {
  const ps = report.passports;
  if (ps.totalAgents === 0) return '<div class="empty-state"><p>No agent passports found.</p><p>Run <code>complior passport init</code> to create one.</p></div>';

  // Extended passport type with optional extra fields from test helper
  type ExtendedPassport = typeof ps.passports[number] & Record<string, unknown>;

  const cards = ps.passports.map((p) => {
    const pExt = p as ExtendedPassport;
    const ringColor = completenessColor(p.completenessZone);
    const circumference = 113.1;
    const offset = circumference * (1 - p.completeness / 100);

    const missingChips = (p.missingFields ?? []).map((f) =>
      `<span class="pp-field missing">${escapeHtml(f)}</span>`,
    ).join('');

    // HR-7: Wrap in <details><summary> for expand/collapse
    // Expanded body has Identity / Compliance / Evidence sections
    return `
      <details class="pp-details">
        <summary class="pp-summary">
          <div class="pp-summary-content">
            <div class="pp-ring">
              <svg viewBox="0 0 44 44"><circle class="pp-ring-bg" cx="22" cy="22" r="18"/><circle class="pp-ring-fill" cx="22" cy="22" r="18" stroke="${ringColor}" stroke-dasharray="${circumference}" stroke-dashoffset="${offset.toFixed(1)}"/></svg>
              <div class="pp-ring-val">${pct(p.completeness)}%</div>
            </div>
            <div class="pp-info">
              <div class="pp-name">${escapeHtml(p.name)}</div>
              <div class="pp-tags">
                ${p.friaCompleted ? '<span class="tag tag-green">FRIA</span>' : '<span class="tag tag-gray">No FRIA</span>'}
                ${p.signed ? '<span class="tag tag-green">Signed</span>' : '<span class="tag tag-gray">Unsigned</span>'}
              </div>
            </div>
          </div>
        </summary>
        <div class="pp-body">
          <div class="pp-section">
            <div class="pp-section-title">Identity</div>
            <div class="pp-field-grid">
              <span class="pp-field filled">Name: ${escapeHtml(p.name)}</span>
              ${pExt.kind ? `<span class="pp-field filled">Kind: ${escapeHtml(String(pExt.kind))}</span>` : ''}
              ${pExt.autonomyLevel ? `<span class="pp-field filled">Autonomy: ${escapeHtml(String(pExt.autonomyLevel))}</span>` : ''}
            </div>
          </div>
          <div class="pp-section">
            <div class="pp-section-title">Compliance</div>
            <div class="pp-field-grid">
              ${pExt.complianceStatus ? `<span class="pp-field ${pExt.complianceStatus === 'compliant' ? 'filled' : 'missing'}">Status: ${escapeHtml(String(pExt.complianceStatus))}</span>` : ''}
              ${p.friaCompleted ? '<span class="pp-field filled">FRIA completed</span>' : '<span class="pp-field missing">FRIA missing</span>'}
              <span class="pp-field filled">Completeness: ${p.filledFields}/${p.totalFields} fields</span>
            </div>
          </div>
          <div class="pp-section">
            <div class="pp-section-title">Evidence</div>
            <div class="pp-field-grid">
              ${p.signed ? '<span class="pp-field filled">Signed (ed25519)</span>' : '<span class="pp-field missing">Not signed</span>'}
              ${p.lastUpdated ? `<span class="pp-field filled">Updated: ${escapeHtml(p.lastUpdated)}</span>` : ''}
              <span class="pp-field filled">Completeness: ${p.completeness}%</span>
            </div>
          </div>
          ${(p.missingFields ?? []).length > 0 ? `
          <div class="pp-section">
            <div class="pp-section-title">Missing Fields (${p.missingFields.length})</div>
            <div class="pp-field-grid">${missingChips}</div>
          </div>` : ''}
        </div>
      </details>`;
  }).join('');

  return `
    <style>
    .pp-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-top:.75rem}
    @media(max-width:900px){.pp-grid{grid-template-columns:1fr}}
    .pp-details{border:1px solid var(--b2);border-radius:14px;background:var(--card);transition:border-color .2s,box-shadow .2s}
    .pp-details[open]{border-color:var(--teal);box-shadow:0 4px 16px rgba(13,148,136,.1)}
    .pp-summary{padding:1.25rem;cursor:pointer;list-style:none}
    .pp-summary::-webkit-details-marker{display:none}
    .pp-summary-content{display:flex;gap:1.125rem;align-items:flex-start}
    .pp-ring{width:64px;height:64px;flex-shrink:0;position:relative}
    .pp-ring svg{width:64px;height:64px;transform:rotate(-90deg)}
    .pp-ring-bg{fill:none;stroke:var(--bg4);stroke-width:4.5}
    .pp-ring-fill{fill:none;stroke-width:4.5;stroke-linecap:round;transition:stroke-dashoffset .8s cubic-bezier(.22,1,.36,1)}
    .pp-ring-val{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-family:var(--f-mono);font-size:.8125rem;font-weight:700;color:var(--dark)}
    .pp-info{flex:1;min-width:0}
    .pp-name{font-family:var(--f-display);font-size:1.125rem;font-weight:700;color:var(--dark);margin-bottom:.375rem}
    .pp-tags{display:flex;gap:.375rem;flex-wrap:wrap;margin-bottom:.5rem}
    .pp-body{padding:0 1.25rem 1.25rem;border-top:1px solid var(--b)}
    .pp-section{margin-top:1rem}
    .pp-section-title{font-family:var(--f-mono);font-size:.5625rem;font-weight:700;color:var(--teal);text-transform:uppercase;letter-spacing:.06em;margin-bottom:.5rem}
    .pp-field-grid{display:flex;flex-wrap:wrap;gap:.3125rem}
    .pp-field{font-family:var(--f-mono);font-size:.5rem;padding:.1875rem .4375rem;border-radius:4px;border:1px solid var(--b);color:var(--dark5);background:transparent}
    .pp-field.filled{border-color:rgba(13,148,136,.2);color:var(--teal);background:rgba(13,148,136,.06)}
    .pp-field.missing{border-color:rgba(192,57,43,.1);color:var(--coral);background:rgba(192,57,43,.06)}
    </style>
    <div class="stat-row">
      <div class="stat"><span class="stat-num">${ps.totalAgents}</span><span class="stat-label">Agents</span></div>
      <div class="stat"><span class="stat-num">${pct(ps.averageCompleteness)}</span><span class="stat-label">Avg Completeness</span></div>
    </div>
    <div class="pp-grid">${cards}</div>`;
};

// --- TAB 8: Actions (HR-8: explanatory intro header) ---

const renderTabActions = (report: ComplianceReport): string => {
  const actions = report.actionPlan.actions;

  // HR-8: Add explanatory intro paragraph
  const intro = actions.length > 0
    ? `<p class="tab-intro">Suggested next commands for your current compliance state. Each action is ranked by priority score, severity, and days until deadline.</p>`
    : '';

  if (actions.length === 0) return `${intro}<p class="muted">No priority actions identified.</p>`;

  // HR-8: Deduplicate commands - only show unique commands once
  const seenCommands = new Set<string>();
  const uniqueActions = actions.filter((a) => {
    if (seenCommands.has(a.command)) return false;
    seenCommands.add(a.command);
    return true;
  });

  const rows = uniqueActions.map((a) => `
    <tr data-rank="${a.rank}" data-sev="${SEV_ORDER[a.severity] ?? 9}" data-days="${a.daysLeft ?? 9999}" data-impact="${a.scoreImpact}" data-source="${a.source ?? ''}">
      <td class="rank">#${a.rank}</td>
      <td><span class="severity-dot" style="background:${severityColor(a.severity)}"></span>${escapeHtml(a.title ?? '')}</td>
      <td><span class="tag tag-gray">${escapeHtml(a.source ?? '')}</span></td>
      <td>${escapeHtml(a.article ?? '')}</td>
      <td>${a.daysLeft !== null ? `${a.daysLeft}d` : '-'}</td>
      <td>${a.fixAvailable ? '<span class="tag tag-green">Auto</span>' : '<span class="tag tag-gray">Manual</span>'}</td>
      <td><code>${escapeHtml(a.command ?? '')}</code></td>
    </tr>`).join('');

  return `
    ${digitalOmnibusBanner()}
    ${intro}
    ${report.actionPlan.totalActions > report.actionPlan.shownActions ? `<p class="muted">Showing ${report.actionPlan.shownActions} of ${report.actionPlan.totalActions} actions</p>` : ''}
    <table class="actions-table" id="actions-tbl">
      <thead><tr>
        <th class="sortable" data-col="rank">#</th>
        <th>Action</th>
        <th>Source</th>
        <th>Article</th>
        <th class="sortable" data-col="days">Days Left</th>
        <th>Fix</th>
        <th>Command</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
};

// --- TAB 9: Timeline (HR-8: explanatory intro header) ---

const renderTabTimeline = (report: ComplianceReport): string => {
  const s = report.summary;
  const obl = report.obligations;
  const enfPct = s.daysUntilEnforcement > 0 ? Math.max(0, Math.min(100, 100 - (s.daysUntilEnforcement / 490) * 100)) : 100;

  // HR-8: Add explanatory intro paragraph
  const profile = report.profile;
  const introText = profile
    ? `EU AI Act enforcement deadlines for ${profile.role} / ${profile.riskLevel} risk / ${profile.domain} domain.`
    : `EU AI Act enforcement deadlines.`;

  // Group obligations by deadline (guard against simplified format with no obligations array)
  const allObls = obl.byArticle.flatMap((a) => a.obligations ?? []);
  const pastDue = allObls.filter((o) => !o.covered && o.deadline && new Date(o.deadline as string) < new Date());
  const mainEnforcement = allObls.filter((o) => !pastDue.includes(o));

  return `
    ${digitalOmnibusBanner()}
    <p class="tab-intro">${introText} Key dates: 2025-08-02 (AI Literacy), 2026-08-02 (Main Enforcement), 2027-08-02 (High-Risk Annex III).</p>
    <h3>Enforcement Countdown</h3>
    <p>${s.daysUntilEnforcement > 0 ? `${s.daysUntilEnforcement} days until EU AI Act enforcement (${s.enforcementDate})` : 'Enforcement date has passed'}</p>
    <div class="countdown-bar"><div class="countdown-fill" style="width:${enfPct}%"></div></div>

    ${pastDue.length > 0 ? `
    <h3>Past Due (${pastDue.length})</h3>
    <ul class="timeline-list">${pastDue.map((o) => `<li class="past-due"><strong>${escapeHtml(o.id)}</strong> ${escapeHtml(o.title)} &mdash; ${o.deadline ? escapeHtml(o.deadline) : 'no date'}</li>`).join('')}</ul>` : ''}

    <h3>${s.enforcementDate} &mdash; Main Enforcement (${mainEnforcement.length} obligations)</h3>
    <div class="muted">${mainEnforcement.filter((o) => !o.covered).length} uncovered, ${mainEnforcement.filter((o) => o.covered).length} covered</div>
    <details><summary class="muted">Show all obligations</summary>
    <ul class="timeline-list">${mainEnforcement.map((o) => `<li>${o.covered ? '<span style="color:var(--teal)">&#10003;</span>' : '<span style="color:var(--coral)">&#10007;</span>'} ${escapeHtml(o.id)} ${escapeHtml(o.title)}</li>`).join('')}</ul>
    </details>`;
};

// --- Main renderer ---

export const generateReportHtml = (report: ComplianceReport): string => {
  const zone = report.readiness.zone;
  const score = report.readiness.readinessScore;

  const tabNav = TABS.map((t, i) =>
    `<button class="tab-btn${i === 0 ? ' active' : ''}" data-tab="${t.id}" id="btn-${t.id}">${t.label}</button>`,
  ).join('');

  const tabContents = [
    { id: 'overview', html: renderTabOverview(report) },
    { id: 'tests', html: renderTabTests(report) },
    { id: 'findings', html: renderTabFindings(report) },
    { id: 'laws', html: renderTabLaws(report) },
    { id: 'documents', html: renderTabDocuments(report) },
    { id: 'fixes', html: renderTabFixes(report) },
    { id: 'passports', html: renderTabPassports(report) },
    { id: 'actions', html: renderTabActions(report) },
    { id: 'timeline', html: renderTabTimeline(report) },
  ];

  const sections = tabContents.map((t, i) =>
    `<div class="tab-content${i === 0 ? ' active' : ''}" id="tab-${t.id}">${t.html}</div>`,
  ).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Complior Report</title>
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
:root{
--bg:#faf8f5;--bg2:#f3f0eb;--bg3:#eae6df;--bg4:#ddd8cf;--bg5:#d0cbc2;
--dark:#1a1a1a;--dark2:#2d2d2d;--dark3:#444;--dark4:#666;--dark5:#888;
--teal:#0d9488;--teal2:#0f766e;--teal3:#115e59;--teal-dim:rgba(13,148,136,.06);--teal-glow:rgba(13,148,136,.12);
--amber:#d97706;--coral:#c0392b;--purple:#6d28d9;--blue:#2563eb;
--score:#d97706;
--b:rgba(0,0,0,.07);--b2:rgba(0,0,0,.12);--b3:rgba(0,0,0,.2);
--card:#fff;--card2:rgba(0,0,0,.02);
--f-display:system-ui,-apple-system,'Segoe UI',sans-serif;--f-body:system-ui,-apple-system,'Segoe UI',sans-serif;--f-mono:'SFMono-Regular','Cascadia Code',Consolas,monospace;
}
html{scroll-behavior:smooth}
body{font-family:var(--f-body);background:var(--bg);color:var(--dark3);line-height:1.6;-webkit-font-smoothing:antialiased;margin:0;padding:0;overflow-x:hidden}
*{scrollbar-width:thin;scrollbar-color:var(--bg4) transparent}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--bg4);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--bg5)}
::selection{background:var(--teal);color:#fff}
body::after{content:'';position:fixed;inset:0;pointer-events:none;z-index:9999;opacity:.015;background:url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.rpt-header{display:flex;justify-content:space-between;align-items:center;padding:1.5rem 2rem;border-bottom:1px solid var(--b2);background:var(--bg2)}
.rpt-header h1{font-family:var(--f-display);font-size:1.5rem;font-weight:800;color:var(--dark);letter-spacing:-.02em}
.rpt-header-meta{font-family:var(--f-mono);font-size:.6875rem;color:var(--dark5);margin-top:.125rem}
.rpt-score{display:flex;align-items:center;gap:.75rem}
.rpt-score-num{font-family:var(--f-display);font-size:2.25rem;font-weight:800;line-height:1;letter-spacing:-.03em}
.rpt-score-of{font-family:var(--f-mono);font-size:.75rem;color:var(--dark5)}
.zone-badge{display:inline-block;padding:3px 12px;border-radius:100px;color:#fff;font-family:var(--f-mono);font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
.tab-bar{display:flex;gap:0;background:var(--bg2);border-bottom:1px solid var(--b2);padding:0 2rem;position:sticky;top:0;z-index:10;flex-wrap:wrap}
.tab-btn{padding:.625rem .875rem;border:none;background:none;font-family:var(--f-mono);font-size:.6875rem;font-weight:500;color:var(--dark5);cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-1px;transition:all .2s;text-transform:uppercase;letter-spacing:.04em;white-space:nowrap}
.tab-btn:hover{color:var(--dark3)}
.tab-btn.active{color:var(--teal);border-bottom-color:var(--teal);font-weight:700}
.tab-content{display:none;padding:1.5rem 2rem}
.tab-content.active{display:block}
h2{font-family:var(--f-display);font-size:1.25rem;font-weight:700;color:var(--dark);letter-spacing:-.02em;margin:1.25rem 0 .625rem;padding-bottom:.375rem;border-bottom:1px solid var(--b2)}
h3{font-family:var(--f-body);font-size:.8125rem;font-weight:700;color:var(--dark);margin:1rem 0 .375rem;text-transform:uppercase;letter-spacing:.02em}
.stat-row{display:flex;gap:1.25rem;margin-bottom:1rem;flex-wrap:wrap}
.stat{text-align:center;min-width:60px}
.stat-num{display:block;font-family:var(--f-display);font-size:1.375rem;font-weight:800;color:var(--dark);letter-spacing:-.02em}
.stat-label{font-family:var(--f-mono);font-size:.5625rem;color:var(--dark5);text-transform:uppercase;letter-spacing:.06em}
.ov-top{display:grid;grid-template-columns:200px 1fr 1fr;gap:1.5rem;align-items:start;margin-bottom:1.5rem}
.ov-donut{text-align:center}
.ov-donut svg{width:140px;height:140px}
.key-stats{display:flex;flex-direction:column;gap:.375rem}
.key-stat{font-size:.8125rem;color:var(--dark3)}
.key-val{font-family:var(--f-display);font-weight:800;font-size:1.125rem;color:var(--dark)}
.sev-cards{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin:1rem 0}
.sev-card{padding:.875rem 1rem;border-radius:10px;border:1px solid var(--b2);background:var(--card);position:relative;overflow:hidden}
.sev-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:4px}
.sev-card.sc-critical::before{background:var(--coral)}
.sev-card.sc-high::before{background:var(--amber)}
.sev-card.sc-medium::before{background:#d4a017}
.sev-card.sc-low::before{background:var(--blue)}
.sev-card-label{font-family:var(--f-mono);font-size:.5625rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;margin-bottom:.25rem}
.sev-card.sc-critical .sev-card-label{color:var(--coral)}
.sev-card.sc-high .sev-card-label{color:var(--amber)}
.sev-card.sc-medium .sev-card-label{color:#d4a017}
.sev-card.sc-low .sev-card-label{color:var(--blue)}
.sev-card-num{font-family:var(--f-display);font-size:1.75rem;font-weight:800;color:var(--dark);line-height:1}
.sev-card-sub{font-family:var(--f-mono);font-size:.5625rem;color:var(--dark5);margin-top:.125rem}
.dim-row{display:flex;align-items:center;gap:.625rem;margin:.375rem 0}
.dim-label{width:110px;font-family:var(--f-mono);font-size:.75rem;font-weight:600;color:var(--dark3);flex-shrink:0}
.dim-bar-bg{flex:1;height:6px;background:var(--bg4);border-radius:3px;overflow:hidden}
.dim-bar{height:100%;border-radius:3px;transition:width .5s cubic-bezier(.22,1,.36,1)}
.dim-value{width:50px;text-align:right;font-family:var(--f-mono);font-size:.6875rem;font-weight:700;color:var(--dark);flex-shrink:0}
.countdown-bar{height:8px;background:var(--bg4);border-radius:4px;overflow:hidden;margin:.5rem 0}
.countdown-fill{height:100%;background:linear-gradient(90deg,var(--teal),var(--amber),var(--coral));border-radius:4px}
.countdown-label{font-family:var(--f-mono);font-size:.75rem;color:var(--dark5)}
.doc-card{border:1px solid var(--b2);border-radius:10px;padding:.875rem 1rem;margin:.5rem 0;background:var(--card);transition:border-color .2s,box-shadow .2s}
.doc-card:hover{border-color:var(--b3);box-shadow:0 2px 8px rgba(0,0,0,.04)}
.doc-header code.doc-id{font-size:.6875rem;background:var(--bg3);padding:1px 6px;border-radius:4px;color:var(--teal);font-weight:700}
.doc-header{display:flex;gap:.625rem;align-items:center;flex-wrap:wrap}
.doc-header strong{font-family:var(--f-display);font-size:.875rem;font-weight:700;color:var(--dark)}
.doc-meta{margin-top:.25rem;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.status-badge,.verdict-badge{display:inline-block;padding:2px 10px;border-radius:100px;color:#fff;font-family:var(--f-mono);font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
.sev-pill{display:inline-block;padding:3px 10px;border-radius:100px;color:#fff;font-family:var(--f-mono);font-size:.625rem;font-weight:700;margin-right:3px;letter-spacing:.03em}
.tag{display:inline-block;padding:2px 8px;border-radius:4px;font-family:var(--f-mono);font-size:.5625rem;font-weight:600}
.tag-green{background:rgba(13,148,136,.08);color:var(--teal);border:1px solid rgba(13,148,136,.15)}
.tag-gray{background:var(--bg3);color:var(--dark4);border:1px solid var(--b2)}
table{width:100%;border-collapse:collapse;font-size:.75rem;margin-top:.375rem}
th{font-family:var(--f-mono);text-align:left;padding:.5rem;border-bottom:1px solid var(--b2);font-size:.5625rem;text-transform:uppercase;letter-spacing:.06em;color:var(--dark5);font-weight:700}
td{padding:.5rem;border-bottom:1px solid var(--b);color:var(--dark3);font-size:.75rem}
tr:hover{background:rgba(13,148,136,.04)}
.finding-item{padding:.625rem 0;border-bottom:1px solid var(--b);position:relative;padding-left:6px}
.finding-item:last-child{border-bottom:none}
.finding-item[data-sev="critical"]{border-left:3px solid var(--coral);padding-left:12px;background:rgba(192,57,43,.04)}
.finding-item[data-sev="high"]{border-left:3px solid var(--coral);padding-left:12px;background:rgba(192,57,43,.03)}
.finding-item[data-sev="medium"]{border-left:3px solid var(--amber);padding-left:12px;background:rgba(217,119,6,.03)}
.finding-item[data-sev="low"]{border-left:3px solid var(--blue);padding-left:12px;background:rgba(37,99,235,.02)}
.finding-item strong{font-family:var(--f-mono);font-size:.75rem;color:var(--dark)}
.severity-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:5px}
.fix-item{padding:.625rem 0;border-bottom:1px solid var(--b)}
.fix-header{display:flex;gap:.5rem;align-items:center;flex-wrap:wrap}
.fix-header strong{font-family:var(--f-mono);font-size:.75rem;color:var(--dark)}
.obl-item{padding:.5rem 0;border-bottom:1px solid var(--b);display:flex;gap:.5rem;align-items:baseline;flex-wrap:wrap;font-size:.75rem}
.obl-item strong{font-family:var(--f-mono);font-size:.6875rem;color:var(--dark)}
.timeline-list{padding-left:1.25rem;font-size:.75rem;color:var(--dark3)}
.timeline-list li{margin:.25rem 0}
.past-due{color:var(--coral)}
.sortable{cursor:pointer;user-select:none;position:relative;padding-right:1rem}
.sortable:hover{color:var(--dark2)}
.sortable::after{content:'\\2195';position:absolute;right:0;font-size:.5rem;opacity:.4}
.sortable.asc::after{content:'\\2191';opacity:.8}
.sortable.desc::after{content:'\\2193';opacity:.8}
.filter-bar{display:flex;gap:.375rem;margin:.5rem 0;align-items:center;flex-wrap:wrap}
.filter-btn{padding:4px 12px;border:1px solid var(--b2);border-radius:100px;background:transparent;font-family:var(--f-mono);font-size:.5625rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--dark5);cursor:pointer;transition:.2s}
.filter-btn:hover{border-color:var(--b3);color:var(--dark3)}
.filter-btn.active{background:rgba(13,148,136,.08);color:var(--teal);border-color:rgba(13,148,136,.2)}
.search-input{padding:6px 12px;border:1px solid var(--b2);border-radius:8px;background:var(--bg3);font-family:var(--f-mono);font-size:.75rem;color:var(--dark);flex:1;min-width:150px;max-width:300px;outline:none;transition:.3s}
.search-input:focus{border-color:var(--teal);box-shadow:0 0 0 2px rgba(13,148,136,.1)}
.search-input::placeholder{color:var(--dark5)}
.muted{color:var(--dark5);font-size:.75rem}
.small{font-size:.6875rem}
code{background:var(--bg3);padding:2px 6px;border-radius:4px;font-family:var(--f-mono);font-size:.75rem;color:var(--teal)}
.empty-state{text-align:center;padding:2.5rem;color:var(--dark5);font-family:var(--f-mono);font-size:.75rem}
.rank{font-family:var(--f-mono);font-weight:700;color:var(--dark5);font-size:.6875rem}
.manual-list{padding-left:1.25rem;font-size:.6875rem;color:var(--dark5)}
.manual-list li{margin:.25rem 0}
.cap-warning{margin-top:.75rem;padding:.625rem;background:rgba(192,57,43,.04);border:1px solid rgba(192,57,43,.12);border-radius:8px;font-size:.75rem;color:var(--coral)}
details summary{cursor:pointer;font-size:.8125rem;color:var(--dark);transition:.2s}
details summary:hover{color:var(--teal)}
details{margin:.25rem 0}
.doc-preview{background:var(--bg3);border:1px solid var(--b2);border-radius:8px;padding:.75rem;margin-top:.375rem;font-family:var(--f-mono);font-size:.5625rem;color:var(--dark4);white-space:pre-wrap;max-height:400px;overflow-y:auto;line-height:1.7}
.test-section{border:1px solid var(--b2);border-radius:14px;padding:1.5rem;margin:1rem 0;background:var(--card)}
.ts-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:.75rem}
.ts-subtitle{font-family:var(--f-mono);font-size:.6875rem;color:var(--dark5);margin-top:.25rem}
.ts-donut{width:56px;height:56px;flex-shrink:0}
.ts-categories{border:1px solid var(--b);border-radius:8px;padding:.625rem .75rem;margin-bottom:.75rem}
.method-badge{display:inline-block;padding:1px 6px;border-radius:3px;font-family:var(--f-mono);font-size:.5rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;vertical-align:middle;margin-left:4px}
.method-badge.det{background:rgba(37,99,235,.08);color:var(--blue);border:1px solid rgba(37,99,235,.15)}
.method-badge.llm{background:rgba(109,40,217,.08);color:var(--purple);border:1px solid rgba(109,40,217,.15)}
.owasp-tag{font-family:var(--f-mono);font-size:.625rem;font-weight:700;color:var(--coral)}
.owasp-dim-label{width:180px}
.test-row{cursor:pointer;transition:background .15s}
.test-row:hover{background:rgba(13,148,136,.06)!important}
.detail-row{display:none}
.detail-row.open{display:table-row}
.detail-row>td{padding:0;border-bottom:1px solid var(--b)}
.test-detail-panel{padding:.75rem 1rem;background:var(--bg3);border-radius:0 0 8px 8px;font-size:.6875rem;color:var(--dark4)}
.td-grid{display:grid;grid-template-columns:1fr 1fr;gap:.75rem;margin-bottom:.5rem}
.td-field{min-width:0}
.td-label{font-family:var(--f-mono);font-size:.5625rem;font-weight:700;text-transform:uppercase;letter-spacing:.04em;color:var(--dark5);margin-bottom:.25rem}
.td-mono{font-family:var(--f-mono);font-size:.625rem;line-height:1.5;color:var(--dark3);word-break:break-word}
.td-meta{font-family:var(--f-mono);font-size:.5625rem;color:var(--dark5);margin-top:.5rem;padding-top:.375rem;border-top:1px solid var(--b)}
.hidden-row{display:none!important}
.show-all-btn{display:block;width:100%;margin-top:.5rem;padding:.5rem;border:1px dashed var(--b2);border-radius:8px;background:transparent;font-family:var(--f-mono);font-size:.6875rem;color:var(--dark5);cursor:pointer;transition:.2s}
.show-all-btn:hover{border-color:var(--teal);color:var(--teal);background:rgba(13,148,136,.03)}
.rpt-footer{text-align:center;padding:1.25rem 2rem;border-top:1px solid var(--b2);font-family:var(--f-mono);font-size:.6875rem;color:var(--dark5)}
.rpt-footer strong{color:var(--teal);font-weight:700}
@media print{
  .tab-bar{display:none}
  .tab-content{display:block!important;break-before:page;padding:1rem}
  body{padding:0}
  body::after{display:none}
  .doc-card,.finding-item,.fix-item,.pp{box-shadow:none;border:1px solid #ccc}
  .detail-row{display:table-row!important}
  .hidden-row{display:table-row!important}
  .show-all-btn{display:none!important}
}
@media(max-width:768px){
  .ov-top{grid-template-columns:1fr}
  .sev-cards{grid-template-columns:repeat(2,1fr)}
  .stat-row{gap:.75rem}
  .rpt-header{flex-direction:column;text-align:center;gap:.75rem}
  .tab-bar{padding:0 .5rem}
  .tab-btn{padding:.5rem .5rem;font-size:.5rem}
  .tab-content{padding:1rem}
}
</style>
</head>
<body>
<div class="rpt-header">
  <div>
    <h1>Complior Report</h1>
    <div class="rpt-header-meta">
      Generated: ${escapeHtml(report.generatedAt)} &middot; v${escapeHtml(report.compliorVersion)}
    </div>
  </div>
  <div class="rpt-score">
    <div>
      <div class="rpt-score-num" style="color:${ZONE_COLORS[zone]}">${Math.round(score)}</div>
      <div class="rpt-score-of">/ 100</div>
    </div>
    <div class="zone-badge" style="background:${ZONE_COLORS[zone]}">${ZONE_LABELS[zone]}</div>
  </div>
</div>

<div class="tab-bar">${tabNav}</div>

${sections}

<div class="rpt-footer">
  Generated by <strong>Complior</strong> v${escapeHtml(report.compliorVersion)} &middot; EU AI Act Compliance &middot; ${escapeHtml(report.generatedAt)}
</div>

<script>
(function(){
  /* Tab switching */
  var btns=document.querySelectorAll('.tab-btn');
  var tabs=document.querySelectorAll('.tab-content');
  btns.forEach(function(btn){
    btn.addEventListener('click',function(){
      btns.forEach(function(b){b.classList.remove('active')});
      tabs.forEach(function(t){t.classList.remove('active')});
      btn.classList.add('active');
      var target=document.getElementById('tab-'+btn.getAttribute('data-tab'));
      if(target)target.classList.add('active');
    });
  });

  /* Table sorting */
  document.querySelectorAll('th.sortable').forEach(function(th){
    th.addEventListener('click',function(){
      var tbl=th.closest('table');
      if(!tbl)return;
      var col=th.getAttribute('data-col');
      var asc=!th.classList.contains('asc');
      tbl.querySelectorAll('th.sortable').forEach(function(h){h.classList.remove('asc','desc')});
      th.classList.add(asc?'asc':'desc');
      var tbody=tbl.querySelector('tbody');
      var rows=Array.from(tbody.querySelectorAll('tr'));
      rows.sort(function(a,b){
        var va=parseFloat(a.getAttribute('data-'+col))||0;
        var vb=parseFloat(b.getAttribute('data-'+col))||0;
        return asc?va-vb:vb-va;
      });
      rows.forEach(function(r){tbody.appendChild(r)});
    });
  });

  /* Detail row toggle */
  document.querySelectorAll('.test-row').forEach(function(row){
    row.addEventListener('click',function(){
      var next=row.nextElementSibling;
      if(next&&next.classList.contains('detail-row')){
        next.classList.toggle('open');
      }
    });
  });

  /* Show all button */
  document.querySelectorAll('.show-all-btn').forEach(function(btn){
    btn.addEventListener('click',function(){
      var tblId=btn.getAttribute('data-section');
      var tbl=document.getElementById(tblId);
      if(!tbl)return;
      tbl.querySelectorAll('.hidden-row').forEach(function(row){row.classList.remove('hidden-row')});
      btn.style.display='none';
    });
  });

  /* Filter buttons */
  document.querySelectorAll('.filter-bar').forEach(function(bar){
    var tblId=bar.getAttribute('data-target');
    if(!tblId)return;
    bar.querySelectorAll('.filter-btn').forEach(function(btn){
      btn.addEventListener('click',function(){
        bar.querySelectorAll('.filter-btn').forEach(function(b){b.classList.remove('active')});
        btn.classList.add('active');
        var filter=btn.getAttribute('data-filter');
        var tbl=document.getElementById(tblId);
        if(!tbl)return;
        tbl.querySelectorAll('tbody tr.test-row').forEach(function(row){
          var next=row.nextElementSibling;
          if(filter==='all'){row.style.display='';if(next&&next.classList.contains('detail-row'))next.classList.remove('open')}
          else{var match=row.getAttribute('data-verdict')===filter;row.style.display=match?'':'none';if(next&&next.classList.contains('detail-row'))next.classList.remove('open')}
        });
      });
    });
  });

  /* Search */
  document.querySelectorAll('.search-input').forEach(function(input){
    input.addEventListener('input',function(){
      var q=input.value.toLowerCase();
      var tblId=input.getAttribute('data-table');
      var tbl=document.getElementById(tblId);
      if(!tbl)return;
      tbl.querySelectorAll('tbody tr.test-row').forEach(function(row){
        var match=row.textContent.toLowerCase().indexOf(q)>=0;
        row.style.display=match?'':'none';
        var next=row.nextElementSibling;
        if(next&&next.classList.contains('detail-row'))next.classList.remove('open');
      });
    });
  });

  /* Markdown renderer for document previews */
  document.querySelectorAll('.doc-preview[data-md]').forEach(function(el){
    var md=el.getAttribute('data-md');
    if(!md)return;
    var html=md
      .replace(/^### (.+)$/gm, function(_p,m1){return'<h4>'+m1+'</h4>'})
      .replace(/^## (.+)$/gm, function(_p,m1){return'<h3>'+m1+'</h3>'})
      .replace(/^# (.+)$/gm, function(_p,m1){return'<h2>'+m1+'</h2>'})
      .replace(/\\*\\*(.+?)\\*\\*/g, function(_p,m1){return'<strong>'+m1+'</strong>'})
      .replace(/\\*(.+?)\\*/g, function(_p,m1){return'<em>'+m1+'</em>'})
      .replace(/\`([^\`]+)\`/g, function(_p,m1){return'<code>'+m1+'</code>'})
      .replace(/^- (.+)$/gm, function(_p,m1){return'<li>'+m1+'</li>'})
      .replace(/^> (.+)$/gm, function(_p,m1){return'<blockquote>'+m1+'</blockquote>'})
      .replace(/\\n/g,'<br>');
    el.innerHTML=html;
    el.removeAttribute('data-md');
  });
})();
</script>
</body>
</html>`;
};
