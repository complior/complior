({
  access: 'public',
  httpMethod: 'GET',
  path: '/v1/regulations/timeline',
  method: async ({ query }) => {
    const jurisdictionId = query.jurisdictionId || 'eu-ai-act';

    const result = await db.query(
      'SELECT * FROM "TimelineEvent" WHERE "jurisdictionId" = $1 ORDER BY date',
      [jurisdictionId]
    );

    const events = result.rows || result;

    return {
      jurisdictionId,
      total: events.length,
      events: events.map((e) => ({
        eventId: e.eventId,
        phase: e.phase,
        date: e.date,
        whatApplies: e.whatApplies,
        status: e.status,
        monitoringUrl: e.monitoringUrl,
      })),
    };
  },
})
