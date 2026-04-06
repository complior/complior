import type { ComplianceReport, ReadinessZone, DocumentStatusLevel, PriorityAction } from './types.js';

const ZONE_COLORS: Record<ReadinessZone, string> = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
};

const DOC_STATUS_COLORS: Record<DocumentStatusLevel, string> = {
  missing: '#ef4444',
  scaffold: '#f97316',
  draft: '#eab308',
  reviewed: '#22c55e',
};

const severityColor = (s: string): string => {
  switch (s) {
    case 'critical': return '#dc2626';
    case 'high': return '#ef4444';
    case 'medium': return '#f59e0b';
    case 'low': return '#3b82f6';
    default: return '#6b7280';
  }
};

const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const pct = (n: number): string => `${Math.round(n)}%`;

const renderGauge = (score: number, zone: ReadinessZone): string => {
  const color = ZONE_COLORS[zone];
  const angle = (score / 100) * 180;
  return `
    <div class="gauge-container">
      <svg viewBox="0 0 200 120" width="200" height="120">
        <path d="M 10 110 A 90 90 0 0 1 190 110" fill="none" stroke="#e5e7eb" stroke-width="16" stroke-linecap="round"/>
        <path d="M 10 110 A 90 90 0 0 1 190 110" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round"
          stroke-dasharray="${(angle / 180) * 283} 283"/>
        <text x="100" y="95" text-anchor="middle" font-size="36" font-weight="bold" fill="${color}">${Math.round(score)}</text>
        <text x="100" y="115" text-anchor="middle" font-size="12" fill="#6b7280">/ 100</text>
      </svg>
      <div class="zone-badge" style="background:${color}">${zone.toUpperCase()}</div>
    </div>`;
};

const renderDimensions = (report: ComplianceReport): string => {
  const dims = report.readiness.dimensions;
  const entries = [
    { label: 'Scan', ...dims.scan },
    { label: 'Scan (security)', ...dims.scanSecurity },
    { label: 'Scan (LLM)', ...dims.scanLlm },
    { label: 'Documents', ...dims.documents },
    { label: 'Passports', ...dims.passports },
    { label: 'Eval', ...dims.eval },
    { label: 'Evidence', ...dims.evidence },
  ];
  return entries.map((d) => `
    <div class="dim-row">
      <span class="dim-label">${d.label}</span>
      <div class="dim-bar-bg">
        <div class="dim-bar" style="width:${d.score ?? 0}%;background:${d.available ? '#3b82f6' : '#d1d5db'}"></div>
      </div>
      <span class="dim-value">${d.available ? pct(d.score ?? 0) : 'N/A'}</span>
      <span class="dim-weight">${Math.round(d.weight * 100)}%w</span>
    </div>`).join('');
};

const renderDocuments = (report: ComplianceReport): string => {
  const docs = report.documents;
  const rows = docs.documents.map((d) => `
    <tr>
      <td>${escapeHtml(d.docType)}</td>
      <td>${escapeHtml(d.article)}</td>
      <td><span class="status-badge" style="background:${DOC_STATUS_COLORS[d.status]}">${d.status}</span></td>
      <td>${escapeHtml(d.description)}</td>
    </tr>`).join('');

  return `
    <div class="stat-row">
      <div class="stat"><span class="stat-num">${docs.total}</span><span class="stat-label">Total</span></div>
      <div class="stat"><span class="stat-num" style="color:#22c55e">${docs.byStatus.reviewed}</span><span class="stat-label">Reviewed</span></div>
      <div class="stat"><span class="stat-num" style="color:#eab308">${docs.byStatus.draft}</span><span class="stat-label">Draft</span></div>
      <div class="stat"><span class="stat-num" style="color:#f97316">${docs.byStatus.scaffold}</span><span class="stat-label">Scaffold</span></div>
      <div class="stat"><span class="stat-num" style="color:#ef4444">${docs.byStatus.missing}</span><span class="stat-label">Missing</span></div>
    </div>
    <table><thead><tr><th>Type</th><th>Article</th><th>Status</th><th>Description</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
};

const renderObligations = (report: ComplianceReport): string => {
  const obl = report.obligations;
  const bars = obl.byArticle.map((a) => {
    const pctVal = a.total > 0 ? (a.covered / a.total) * 100 : 0;
    return `
      <div class="obl-row">
        <span class="obl-art">${escapeHtml(a.article)}</span>
        <div class="obl-bar-bg"><div class="obl-bar" style="width:${pctVal}%"></div></div>
        <span class="obl-count">${a.covered}/${a.total}</span>
      </div>`;
  }).join('');

  return `
    <div class="stat-row">
      <div class="stat"><span class="stat-num">${obl.total}</span><span class="stat-label">Total</span></div>
      <div class="stat"><span class="stat-num" style="color:#22c55e">${obl.covered}</span><span class="stat-label">Covered</span></div>
      <div class="stat"><span class="stat-num" style="color:#ef4444">${obl.uncovered}</span><span class="stat-label">Uncovered</span></div>
      <div class="stat"><span class="stat-num">${obl.coveragePercent}%</span><span class="stat-label">Coverage</span></div>
    </div>
    ${bars}`;
};

const renderPassports = (report: ComplianceReport): string => {
  const ps = report.passports;
  if (ps.totalAgents === 0) return '<p class="muted">No agent passports found.</p>';

  const cards = ps.passports.map((p) => `
    <div class="passport-card">
      <div class="passport-header">
        <strong>${escapeHtml(p.name)}</strong>
        <span class="zone-badge" style="background:${ZONE_COLORS[p.completenessZone === 'amber' ? 'orange' : p.completenessZone]}">${pct(p.completeness)}</span>
      </div>
      <div class="passport-meta">
        ${p.friaCompleted ? '<span class="tag tag-green">FRIA</span>' : '<span class="tag tag-gray">No FRIA</span>'}
        ${p.signed ? '<span class="tag tag-green">Signed</span>' : '<span class="tag tag-gray">Unsigned</span>'}
        <span class="muted">${p.filledFields}/${p.totalFields} fields</span>
      </div>
      ${p.missingFields.length > 0 ? `<details><summary class="muted">${p.missingFields.length} missing fields</summary><p class="muted small">${p.missingFields.join(', ')}</p></details>` : ''}
    </div>`).join('');

  return `
    <div class="stat-row">
      <div class="stat"><span class="stat-num">${ps.totalAgents}</span><span class="stat-label">Agents</span></div>
      <div class="stat"><span class="stat-num">${pct(ps.averageCompleteness)}</span><span class="stat-label">Avg Completeness</span></div>
    </div>
    ${cards}`;
};

const renderActions = (actions: readonly PriorityAction[]): string => {
  if (actions.length === 0) return '<p class="muted">No priority actions identified.</p>';

  const rows = actions.map((a) => `
    <tr>
      <td class="rank">#${a.rank}</td>
      <td><span class="severity-dot" style="background:${severityColor(a.severity)}"></span>${escapeHtml(a.title)}</td>
      <td>${escapeHtml(a.article)}</td>
      <td>${a.daysLeft !== null ? `${a.daysLeft}d` : '-'}</td>
      <td>${a.fixAvailable ? '<span class="tag tag-green">Auto</span>' : '<span class="tag tag-gray">Manual</span>'}</td>
      <td><code>${escapeHtml(a.command)}</code></td>
    </tr>`).join('');

  return `
    <table class="actions-table">
      <thead><tr><th>#</th><th>Action</th><th>Article</th><th>Days Left</th><th>Fix</th><th>Command</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const renderSummary = (report: ComplianceReport): string => {
  const s = report.summary;
  return `
    <div class="summary-grid">
      <div class="summary-item"><span class="summary-val">${s.daysUntilEnforcement}</span><span class="summary-label">Days Until Enforcement</span></div>
      <div class="summary-item"><span class="summary-val">${s.enforcementDate}</span><span class="summary-label">Enforcement Date</span></div>
      <div class="summary-item"><span class="summary-val">${s.totalFindings}</span><span class="summary-label">Fail Findings</span></div>
      <div class="summary-item"><span class="summary-val" style="color:${severityColor('critical')}">${s.criticalFindings}</span><span class="summary-label">Critical</span></div>
      <div class="summary-item"><span class="summary-val">${s.autoFixable}</span><span class="summary-label">Auto-Fixable</span></div>
      <div class="summary-item"><span class="summary-val">${s.scanScore ?? 'N/A'}</span><span class="summary-label">Scan Score</span></div>
      <div class="summary-item"><span class="summary-val">${s.evalScore ?? 'N/A'}</span><span class="summary-label">Eval Score</span></div>
      <div class="summary-item"><span class="summary-val">${s.evidenceChainLength}</span><span class="summary-label">Evidence Entries</span></div>
    </div>`;
};

export const generateReportHtml = (report: ComplianceReport): string => {
  const zone = report.readiness.zone;
  const score = report.readiness.readinessScore;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Complior Compliance Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#1e293b;line-height:1.6;padding:2rem;max-width:1100px;margin:0 auto}
h1{font-size:1.75rem;margin-bottom:.5rem}
h2{font-size:1.25rem;margin:2rem 0 1rem;padding-bottom:.5rem;border-bottom:2px solid #e2e8f0}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:2rem;padding-bottom:1rem;border-bottom:3px solid ${ZONE_COLORS[zone]}}
.header-meta{font-size:.85rem;color:#64748b}
.gauge-container{text-align:center;margin:1rem 0}
.zone-badge{display:inline-block;padding:2px 10px;border-radius:12px;color:#fff;font-size:.75rem;font-weight:600;letter-spacing:.05em}
.section{background:#fff;border-radius:12px;padding:1.5rem;margin-bottom:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.stat-row{display:flex;gap:1.5rem;margin-bottom:1rem;flex-wrap:wrap}
.stat{text-align:center}
.stat-num{display:block;font-size:1.5rem;font-weight:700}
.stat-label{font-size:.75rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
table{width:100%;border-collapse:collapse;font-size:.875rem;margin-top:.5rem}
th{text-align:left;padding:.5rem;border-bottom:2px solid #e2e8f0;font-size:.75rem;text-transform:uppercase;color:#64748b}
td{padding:.5rem;border-bottom:1px solid #f1f5f9}
.status-badge{display:inline-block;padding:2px 8px;border-radius:8px;color:#fff;font-size:.7rem;font-weight:600;text-transform:uppercase}
.dim-row{display:flex;align-items:center;gap:.75rem;margin:.4rem 0}
.dim-label{width:90px;font-size:.85rem;font-weight:500}
.dim-bar-bg{flex:1;height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden}
.dim-bar{height:100%;border-radius:5px;transition:width .3s}
.dim-value{width:45px;text-align:right;font-size:.85rem;font-weight:600}
.dim-weight{width:40px;text-align:right;font-size:.75rem;color:#94a3b8}
.obl-row{display:flex;align-items:center;gap:.5rem;margin:.3rem 0}
.obl-art{width:120px;font-size:.8rem;font-weight:500}
.obl-bar-bg{flex:1;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}
.obl-bar{height:100%;background:#3b82f6;border-radius:4px}
.obl-count{width:50px;text-align:right;font-size:.8rem;color:#64748b}
.passport-card{border:1px solid #e2e8f0;border-radius:8px;padding:1rem;margin:.5rem 0}
.passport-header{display:flex;justify-content:space-between;align-items:center}
.passport-meta{display:flex;gap:.5rem;align-items:center;margin-top:.5rem;flex-wrap:wrap}
.tag{display:inline-block;padding:1px 6px;border-radius:4px;font-size:.7rem;font-weight:500}
.tag-green{background:#dcfce7;color:#166534}
.tag-gray{background:#f1f5f9;color:#64748b}
.muted{color:#94a3b8;font-size:.8rem}
.small{font-size:.75rem}
.severity-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
.actions-table .rank{font-weight:700;color:#64748b}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:.8rem}
.summary-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:1rem}
.summary-item{text-align:center;padding:.75rem;background:#f8fafc;border-radius:8px}
.summary-val{display:block;font-size:1.25rem;font-weight:700}
.summary-label{font-size:.7rem;color:#64748b;text-transform:uppercase}
.footer{text-align:center;margin-top:2rem;padding-top:1rem;border-top:1px solid #e2e8f0;font-size:.75rem;color:#94a3b8}
details summary{cursor:pointer}
@media print{body{padding:0}h2{break-before:auto}.section{box-shadow:none;border:1px solid #e2e8f0}}
@media(max-width:640px){body{padding:1rem}.stat-row{gap:.75rem}.summary-grid{grid-template-columns:repeat(2,1fr)}}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>Complior Compliance Report</h1>
    <div class="header-meta">
      Generated: ${escapeHtml(report.generatedAt)} &middot; Complior v${escapeHtml(report.compliorVersion)}
    </div>
  </div>
  ${renderGauge(score, zone)}
</div>

<div class="section">
  <h2>Readiness Dashboard</h2>
  ${renderDimensions(report)}
  ${report.readiness.criticalCaps.length > 0 ? `<div style="margin-top:1rem;padding:.75rem;background:#fef2f2;border-radius:8px;font-size:.85rem;color:#991b1b"><strong>Critical caps applied:</strong> ${report.readiness.criticalCaps.map(escapeHtml).join(', ')}</div>` : ''}
</div>

<div class="section">
  <h2>Document Inventory</h2>
  ${renderDocuments(report)}
</div>

<div class="section">
  <h2>Obligation Coverage</h2>
  ${renderObligations(report)}
</div>

<div class="section">
  <h2>Passport Status</h2>
  ${renderPassports(report)}
</div>

<div class="section">
  <h2>Priority Action Plan</h2>
  ${renderActions(report.actionPlan.actions)}
  ${report.actionPlan.totalActions > report.actionPlan.shownActions ? `<p class="muted" style="margin-top:.5rem">Showing ${report.actionPlan.shownActions} of ${report.actionPlan.totalActions} actions</p>` : ''}
</div>

<div class="section">
  <h2>Summary</h2>
  ${renderSummary(report)}
</div>

<div class="footer">
  Generated by <strong>Complior</strong> v${escapeHtml(report.compliorVersion)} &middot; EU AI Act Compliance Tool &middot; ${escapeHtml(report.generatedAt)}
</div>
</body>
</html>`;
};
