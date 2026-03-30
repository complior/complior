/**
 * Deployer Action Generator — Generate deployer-specific action cards.
 *
 * For each tool, produces a list of required/recommended actions
 * based on risk level, obligations, and EU AI Act deadlines.
 *
 * VM sandbox compatible — IIFE returns factory function.
 */
(() => {
  // EU AI Act key deadlines
  const DEADLINES = {
    prohibited: '2025-02-02',     // Art. 5 — prohibited practices
    gpai: '2025-08-02',           // Art. 51-52 — GPAI obligations
    high_risk: '2026-08-02',      // Art. 6-49 — high-risk requirements
    limited_risk: '2026-08-02',   // Art. 50 — transparency obligations
    all: '2026-08-02',            // General obligations (Art. 4 literacy)
  };

  /**
   * Map obligation to an actionable deployer task.
   */
  const OBLIGATION_ACTIONS = {
    'OBL-001': {
      title: 'Ensure AI Literacy for staff (Art. 4)',
      description: 'Train relevant staff on AI capabilities, limitations, and compliance obligations.',
      cta: 'Start AI Literacy course',
      ctaLink: '/literacy',
      deadline: DEADLINES.all,
      priority: 'required',
    },
    'OBL-015': {
      title: 'Disclose AI usage to affected persons (Art. 50)',
      description: 'Inform users, employees, or customers that they are interacting with an AI system.',
      cta: 'Generate notification template',
      ctaLink: '/documents/new?type=ai-disclosure',
      deadline: DEADLINES.limited_risk,
      priority: 'required',
    },
    'OBL-008': {
      title: 'Implement Human Oversight (Art. 26)',
      description: 'Ensure human oversight mechanisms are in place for AI-assisted decisions.',
      cta: 'Configure oversight policy',
      ctaLink: '/compliance/oversight',
      deadline: DEADLINES.high_risk,
      priority: 'required',
    },
    'OBL-003': {
      title: 'Establish Data Governance (Art. 10)',
      description: 'Ensure training and input data meets quality, representativeness, and bias requirements.',
      cta: 'Review data governance',
      ctaLink: '/compliance/data-governance',
      deadline: DEADLINES.high_risk,
      priority: 'required',
    },
    'OBL-009': {
      title: 'Monitor Robustness & Accuracy (Art. 26)',
      description: 'Set up ongoing monitoring for AI system accuracy, robustness, and cybersecurity.',
      cta: 'Set up monitoring',
      ctaLink: '/monitoring',
      deadline: DEADLINES.high_risk,
      priority: 'required',
    },
    'OBL-029': {
      title: 'Conduct FRIA Assessment (Art. 27)',
      description: 'Perform a Fundamental Rights Impact Assessment before deploying high-risk AI.',
      cta: 'Start FRIA',
      ctaLink: '/fria/new',
      deadline: DEADLINES.high_risk,
      priority: 'required',
    },
    'OBL-004': {
      title: 'Implement Risk Management (Art. 9)',
      description: 'Establish a risk management system for the AI tool lifecycle.',
      cta: 'Create risk assessment',
      ctaLink: '/compliance/risk-management',
      deadline: DEADLINES.high_risk,
      priority: 'required',
    },
  };

  return () => {
    return {
      /**
       * Generate deployer action cards for a registry tool.
       *
       * @param {Object} tool - Registry tool data
       * @param {Array} obligations - Deployer obligations list
       * @returns {Object} { actions, summary }
       */
      generateActions(tool, obligations) {
        const actions = [];
        const now = new Date();

        const oblList = obligations || [];

        for (const obl of oblList) {
          const actionTemplate = OBLIGATION_ACTIONS[obl.id || obl.obligation_id];
          if (!actionTemplate) continue;

          const deadlineDate = new Date(actionTemplate.deadline);
          const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));
          const isOverdue = daysUntil < 0;
          const isUrgent = daysUntil >= 0 && daysUntil <= 90;

          actions.push({
            obligationId: obl.id || obl.obligation_id,
            title: actionTemplate.title,
            description: actionTemplate.description,
            cta: actionTemplate.cta,
            ctaLink: actionTemplate.ctaLink,
            deadline: actionTemplate.deadline,
            daysUntilDeadline: daysUntil,
            isOverdue,
            isUrgent,
            priority: obl.required !== false ? 'required' : 'recommended',
            status: obl.status || 'unknown',
          });
        }

        // Sort: overdue first, then urgent, then by deadline
        actions.sort((a, b) => {
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
          return a.daysUntilDeadline - b.daysUntilDeadline;
        });

        const required = actions.filter((a) => a.priority === 'required');
        const nearestDeadline = actions.length > 0
          ? actions.reduce((min, a) =>
            a.daysUntilDeadline < min.daysUntilDeadline ? a : min,
          ).deadline
          : null;

        return {
          actions,
          summary: {
            totalActions: actions.length,
            requiredActions: required.length,
            overdueActions: actions.filter((a) => a.isOverdue).length,
            urgentActions: actions.filter((a) => a.isUrgent).length,
            nearestDeadline,
            riskLevel: tool.riskLevel || 'unknown',
          },
        };
      },
    };
  };
})()
