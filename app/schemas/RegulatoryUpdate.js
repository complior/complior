({
  Entity: {},

  source: {
    enum: ['eur_lex', 'ai_office', 'bsi', 'enisa', 'manual'],
  },
  title: { type: 'string', length: { max: 500 } },
  summary: { type: 'string', length: { max: 5000 } },
  url: { type: 'string' },
  publishedAt: 'datetime',
  scrapedAt: 'datetime',
  relevantArticles: { type: 'json', note: 'Array of article references' },
  processed: { type: 'boolean', default: false },
});
