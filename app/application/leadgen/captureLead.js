(() => {
  const REPORT_EMAIL_SUBJECT = 'Your EU AI Act Compliance Report — Complior';

  const buildReportHtml = () => `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:12px;border:1px solid rgba(255,255,255,0.06)">

<tr><td style="padding:40px 40px 20px">
<div style="font-size:24px;font-weight:700;color:#e8e8ed;margin-bottom:8px">Complior<span style="color:#2dd4a8">.ai</span></div>
<div style="font-size:12px;color:#6b6b80;font-family:monospace">EU AI Act Compliance Platform</div>
</td></tr>

<tr><td style="padding:0 40px 30px">
<h1 style="font-size:22px;color:#e8e8ed;margin:0 0 16px;font-weight:600">Your EU AI Act Compliance Report</h1>
<p style="font-size:14px;color:#a0a0b0;line-height:1.7;margin:0 0 24px">
Thank you for your interest in EU AI Act compliance. Here are the key findings from our latest research:
</p>

<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px">
<tr>
<td width="33%" style="padding:12px;background:#1a1a25;border-radius:8px;text-align:center">
<div style="font-size:24px;font-weight:700;color:#2dd4a8">73%</div>
<div style="font-size:11px;color:#6b6b80;margin-top:4px">Companies affected</div>
</td>
<td width="8"></td>
<td width="33%" style="padding:12px;background:#1a1a25;border-radius:8px;text-align:center">
<div style="font-size:24px;font-weight:700;color:#f59e0b">€35M</div>
<div style="font-size:11px;color:#6b6b80;margin-top:4px">Max penalty</div>
</td>
<td width="8"></td>
<td width="33%" style="padding:12px;background:#1a1a25;border-radius:8px;text-align:center">
<div style="font-size:24px;font-weight:700;color:#e8e8ed">Aug 2</div>
<div style="font-size:11px;color:#6b6b80;margin-top:4px">2026 deadline</div>
</td>
</tr>
</table>

<a href="https://complior.ai/reports/ai-act-compliance-2026.pdf"
   style="display:inline-block;padding:14px 32px;background:#2dd4a8;color:#0a0a0f;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px">
Download Full Report →
</a>
</td></tr>

<tr><td style="padding:0 40px 40px">
<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:24px">
<p style="font-size:12px;color:#6b6b80;line-height:1.6;margin:0">
Complior AI GmbH · Berlin, Germany<br>
<a href="https://complior.ai" style="color:#2dd4a8;text-decoration:none">complior.ai</a>
</p>
</div>
</td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  const URGENCY_CONFIG = {
    High: { color: '#ef4444', label: 'High Urgency', desc: 'Immediate action required' },
    Medium: { color: '#f59e0b', label: 'Medium Urgency', desc: 'Action needed within 3 months' },
    Low: { color: '#2dd4a8', label: 'Low Urgency', desc: 'Monitor and prepare' },
  };

  const FINDING_STYLES = {
    d: { color: '#ef4444', bg: '#1c1017', border: '#ef4444', label: 'Critical' },
    w: { color: '#f59e0b', bg: '#1a1810', border: '#f59e0b', label: 'Warning' },
    n: { color: '#60a5fa', bg: '#101520', border: '#60a5fa', label: 'Info' },
  };

  // Map finding text patterns to Complior solutions
  const SOLUTION_MAP = [
    { match: 'Art. 4', solution: 'Complior provides ready-made AI Literacy training courses with quizzes and completion certificates for your entire team.' },
    { match: 'Art. 26', solution: 'Complior auto-generates deployer documentation: usage policies, monitoring plans, and record-keeping templates.' },
    { match: 'Art. 50', solution: 'Complior generates transparency notices and employee notification documents that satisfy Art. 50 requirements.' },
    { match: 'Art. 14', solution: 'Complior creates human oversight documentation with assigned roles, review processes, and escalation procedures.' },
    { match: 'Art. 6', solution: 'Complior classifies all your AI tools by risk level and generates the required compliance documentation for each.' },
    { match: 'Annex III', solution: 'Complior generates Fundamental Rights Impact Assessments (FRIA) with pre-filled sections based on your tool data.' },
    { match: 'inventory', solution: 'Complior scans your codebase to auto-discover AI tools and maintains a complete AI inventory with risk classifications.' },
    { match: 'AI policy', solution: 'Complior generates a complete AI governance policy covering approved tools, data handling, oversight, and incident response.' },
    { match: 'provider', solution: 'Complior helps providers with conformity assessment preparation, technical documentation, and CE marking workflows.' },
  ];

  const findSolution = (text) => {
    for (const { match, solution } of SOLUTION_MAP) {
      if (text.toLowerCase().includes(match.toLowerCase())) return solution;
    }
    return null;
  };

  const buildQuickCheckHtml = (email, meta) => {
    const urgency = URGENCY_CONFIG[meta.urgency] || URGENCY_CONFIG.Medium;
    const findings = meta.findings || [];

    const findingsHtml = findings.map((f) => {
      const st = FINDING_STYLES[f.t] || FINDING_STYLES.n;
      const text = (f.s || '').replace(/<code>/g, '<span style="background:#1a1a25;padding:2px 6px;border-radius:3px;font-family:monospace;font-size:11px;color:#2dd4a8">').replace(/<\/code>/g, '</span>');
      const solution = findSolution(f.s || '');
      const solutionHtml = solution
        ? `<div style="margin-top:8px;padding:8px 10px;background:#0d1a14;border-radius:4px;border-left:2px solid #2dd4a8">
<span style="font-size:10px;font-weight:600;color:#2dd4a8">HOW COMPLIOR HELPS</span>
<div style="font-size:12px;color:#a0a0b0;line-height:1.5;margin-top:3px">${solution}</div></div>`
        : '';
      return `<tr><td style="padding:10px 12px;background:${st.bg};border-left:3px solid ${st.border};border-radius:4px">
<span style="font-size:10px;font-weight:700;color:${st.color};text-transform:uppercase;letter-spacing:.5px">${st.label}</span>
<div style="font-size:13px;color:#c0c0d0;line-height:1.6;margin-top:4px">${text}</div>
${solutionHtml}
</td></tr><tr><td style="height:8px"></td></tr>`;
    }).join('');

    const criticalCount = findings.filter((f) => f.t === 'd').length;
    const warningCount = findings.filter((f) => f.t === 'w').length;

    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0f;padding:40px 20px">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#12121a;border-radius:12px;border:1px solid rgba(255,255,255,0.06)">

<tr><td style="padding:40px 40px 20px">
<div style="font-size:24px;font-weight:700;color:#e8e8ed;margin-bottom:8px">Complior<span style="color:#2dd4a8">.ai</span></div>
<div style="font-size:12px;color:#6b6b80;font-family:monospace">EU AI Act Compliance Platform</div>
</td></tr>

<tr><td style="padding:0 40px 10px">
<h1 style="font-size:22px;color:#e8e8ed;margin:0 0 8px;font-weight:600">Your AI Act Quick Check Results</h1>
<div style="padding:14px 16px;background:#1a1a25;border-radius:8px;border-left:4px solid ${urgency.color};margin-bottom:16px">
<div style="font-size:15px;font-weight:700;color:${urgency.color};margin-bottom:2px">${urgency.label}</div>
<div style="font-size:12px;color:#6b6b80">${urgency.desc}</div>
</div>
<p style="font-size:13px;color:#a0a0b0;line-height:1.6;margin:0 0 20px">
We found <strong style="color:${criticalCount > 0 ? '#ef4444' : '#e8e8ed'}">${criticalCount} critical</strong> and <strong style="color:${warningCount > 0 ? '#f59e0b' : '#e8e8ed'}">${warningCount} warning</strong> issues. Below is each finding with how Complior can help you resolve it.
</p>
</td></tr>

<tr><td style="padding:0 40px 24px">
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td width="25%" style="padding:10px;background:#1a1a25;border-radius:8px;text-align:center">
<div style="font-size:22px;font-weight:700;color:#e8e8ed">${meta.obligations || 0}</div>
<div style="font-size:10px;color:#6b6b80;margin-top:2px">Obligations</div>
</td><td width="4"></td>
<td width="25%" style="padding:10px;background:#1a1a25;border-radius:8px;text-align:center">
<div style="font-size:22px;font-weight:700;color:${meta.hrCount > 0 ? '#ef4444' : '#2dd4a8'}">${meta.hrCount || 0}</div>
<div style="font-size:10px;color:#6b6b80;margin-top:2px">High-Risk</div>
</td><td width="4"></td>
<td width="25%" style="padding:10px;background:#1a1a25;border-radius:8px;text-align:center">
<div style="font-size:22px;font-weight:700;color:${meta.gaps > 0 ? '#f59e0b' : '#2dd4a8'}">${meta.gaps || 0}</div>
<div style="font-size:10px;color:#6b6b80;margin-top:2px">Gaps</div>
</td><td width="4"></td>
<td width="25%" style="padding:10px;background:#1a1a25;border-radius:8px;text-align:center">
<div style="font-size:22px;font-weight:700;color:${urgency.color}">${meta.score || 0}</div>
<div style="font-size:10px;color:#6b6b80;margin-top:2px">Risk Score</div>
</td>
</tr></table>
</td></tr>

<tr><td style="padding:0 40px 8px">
<div style="font-size:13px;font-weight:600;color:#e8e8ed;margin-bottom:12px">Findings & How to Fix Them</div>
<table width="100%" cellpadding="0" cellspacing="0">
${findingsHtml}
</table>
</td></tr>

<tr><td style="padding:16px 40px 16px">
<div style="background:#0d1a14;border:1px solid rgba(45,212,168,0.2);border-radius:8px;padding:20px;text-align:center">
<div style="font-size:15px;font-weight:600;color:#e8e8ed;margin-bottom:6px">Fix all ${findings.length} issues automatically</div>
<div style="font-size:12px;color:#6b6b80;margin-bottom:16px;line-height:1.5">One command scans your project, classifies every AI tool,<br>and generates all required compliance documents.</div>
<div style="display:inline-block;padding:14px 24px;background:#1a1a25;border:1px solid rgba(45,212,168,0.3);border-radius:8px;font-family:monospace;font-size:14px;color:#2dd4a8;letter-spacing:.5px">$ npx complior</div>
<div style="font-size:11px;color:#6b6b80;margin-top:12px;line-height:1.5">Open source · Works offline · No signup required</div>
<a href="https://github.com/complior/complior" style="display:inline-block;margin-top:10px;font-size:12px;color:#2dd4a8;text-decoration:none">View on GitHub →</a>
</div>
</td></tr>

<tr><td style="padding:8px 40px 40px">
<div style="border-top:1px solid rgba(255,255,255,0.06);padding-top:20px">
<p style="font-size:11px;color:#6b6b80;line-height:1.6;margin:0">
Based on Regulation (EU) 2024/1689. This assessment is for guidance only and does not constitute legal advice.<br>
Complior AI GmbH · Berlin, Germany · <a href="https://complior.ai" style="color:#2dd4a8;text-decoration:none">complior.ai</a>
</p></div>
</td></tr>

</table></td></tr></table></body></html>`;
  };

  return {
    perform: async ({ email, source, metadata }) => {
      // 1. Validate business email (domain layer, pure function)
      const valid = domain.leadgen.validators.businessEmail.isBusinessEmail(email);
      if (!valid) {
        throw new errors.ValidationError(
          'Please use a business email address',
          { email: ['Personal email addresses are not accepted'] },
        );
      }

      // 2. Upsert lead in DB (raw db.query — no organizationId)
      const now = new Date().toISOString();
      const result = await db.query(
        `INSERT INTO "Lead" ("email", "source", "metadata", "lastActivityAt")
         VALUES ($1, $2, $3::jsonb, $4)
         ON CONFLICT ("email")
         DO UPDATE SET
           "metadata" = COALESCE("Lead"."metadata", '{}'::jsonb) || COALESCE($3::jsonb, '{}'::jsonb),
           "lastActivityAt" = $4
         RETURNING "leadId", "email"`,
        [email.toLowerCase().trim(), source, JSON.stringify(metadata || {}), now],
      );
      const lead = result.rows[0];

      // 3. Send email based on source (non-blocking — error logged, doesn't break request)
      if (source === 'report_download') {
        try {
          await brevo.sendTransactional({
            to: email,
            subject: REPORT_EMAIL_SUBJECT,
            htmlContent: buildReportHtml(),
            tags: ['lead', 'report_download'],
          });
        } catch (err) {
          console.error('Brevo report email failed:', err.message);
        }
      } else if (source === 'quick_check' && metadata && metadata.findings) {
        try {
          await brevo.sendTransactional({
            to: email,
            subject: 'Your AI Act Quick Check Results — Complior',
            htmlContent: buildQuickCheckHtml(email, metadata),
            tags: ['lead', 'quick_check'],
          });
        } catch (err) {
          console.error('Brevo quick check email failed:', err.message);
        }
      }

      // 4. Add contact to Brevo (non-blocking)
      try {
        await brevo.createContact({
          email,
          attributes: { LEAD_SOURCE: source },
        });
      } catch (err) {
        console.error('Brevo contact creation failed:', err.message);
      }

      return { leadId: lead.leadId, email: lead.email };
    },
  };
})()
