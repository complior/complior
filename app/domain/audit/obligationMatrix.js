({
  buildHtml: (tools, requirements) => {
    // Group requirements by article
    const articles = {};
    for (const req of requirements) {
      const art = req.articleReference || 'Other';
      if (!articles[art]) articles[art] = [];
      articles[art].push(req);
    }

    const articleKeys = Object.keys(articles).sort();

    let html = '<table style="width:100%;border-collapse:collapse;font-size:11px;">';
    html += '<thead><tr style="background:#f0f4f8;">';
    html += '<th style="border:1px solid #ddd;padding:6px;text-align:left;">Article / Obligation</th>';
    for (const tool of tools) {
      html += `<th style="border:1px solid #ddd;padding:6px;text-align:center;max-width:120px;">${tool.name}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (const art of articleKeys) {
      for (const req of articles[art]) {
        html += '<tr>';
        html += `<td style="border:1px solid #ddd;padding:4px;">${art}: ${req.name}</td>`;
        for (const tool of tools) {
          // Find matching tool requirement
          const tr = req.toolRequirements
            ? req.toolRequirements.find((r) => r.aiToolId === tool.aIToolId)
            : undefined;
          const status = tr ? tr.status : 'not_applicable';
          const colorMap = {
            completed: '#22c55e',
            in_progress: '#eab308',
            pending: '#ef4444',
          };
          const symbolMap = {
            completed: '\u2713',
            in_progress: '\u25D0',
            pending: '\u2717',
          };
          const color = colorMap[status] || '#9ca3af';
          const symbol = symbolMap[status] || '\u2014';
          html += `<td style="border:1px solid #ddd;padding:4px;text-align:center;color:${color};font-weight:bold;">${symbol}</td>`;
        }
        html += '</tr>';
      }
    }

    html += '</tbody></table>';
    return html;
  },
})
