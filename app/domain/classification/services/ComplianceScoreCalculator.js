(() => {
  const calculateToolScore = (requirements) => {
    if (!Array.isArray(requirements) || requirements.length === 0) return 0;

    const applicable = requirements.filter(
      (r) => r.status !== 'not_applicable',
    );
    if (applicable.length === 0) return 0;

    let earned = 0;
    for (const req of applicable) {
      if (req.status === 'completed') {
        earned += 100;
      } else if (req.status === 'in_progress') {
        earned += (req.progress || 0);
      }
      // pending, blocked → 0
    }

    return Math.round((earned / (applicable.length * 100)) * 100);
  };

  const calculateOrgScore = (toolScores) => {
    if (!Array.isArray(toolScores) || toolScores.length === 0) return 0;

    const sum = toolScores.reduce((acc, s) => acc + s, 0);
    return Math.round(sum / toolScores.length);
  };

  const groupByArticle = (requirements) => {
    const groups = {};

    for (const req of requirements) {
      const key = req.articleReference || 'Other';
      if (!groups[key]) {
        groups[key] = { articleReference: key, requirements: [], completed: 0, total: 0 };
      }
      groups[key].requirements.push(req);
      if (req.status !== 'not_applicable') {
        groups[key].total++;
        if (req.status === 'completed') groups[key].completed++;
      }
    }

    return Object.values(groups);
  };

  return { calculateToolScore, calculateOrgScore, groupByArticle };
})()
