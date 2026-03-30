/**
 * Submit to Registry API — Add scanned tool to AI Registry with deployer context.
 *
 * POST /api/public/registry/submit
 *   Body: {
 *     slug: string,
 *     url: string,
 *     answers: {
 *       category: string,          // Q1: chatbot, recruitment, coding, analytics, ...
 *       autonomyLevel: string,     // Q2: fully_autonomous, ai_suggests, human_decides
 *       dataType: string,          // Q3: public_only, business_data, personal_data, sensitive_personal_data
 *       affectedPersons: string,   // Q4: employees, customers, job_applicants, patients, general_public
 *       dataLocation: string,      // Q5: eu, us, unknown, multiple
 *     },
 *     scanEvidence?: object,       // Optional: evidence from prior scan
 *     email?: string,              // For follow-up notifications
 *   }
 *   Returns: { action, slug, riskLevel, obligations, communityReportCount }
 */
({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/public/registry/submit',

  method: async ({ body, headers }) => {
    // Validate required fields
    if (!body || !body.slug || !body.url || !body.answers) {
      throw new errors.ValidationError('Missing required fields', {
        slug: !body || !body.slug ? ['Slug is required'] : [],
        url: !body || !body.url ? ['URL is required'] : [],
        answers: !body || !body.answers ? ['Questionnaire answers are required'] : [],
      });
    }

    const { answers } = body;

    // Validate answers
    const validCategories = [
      'chatbot', 'recruitment', 'coding', 'analytics', 'customer_service',
      'marketing', 'writing', 'image_generation', 'video', 'translation',
      'medical', 'legal', 'finance', 'education', 'api_platform',
      'credit_scoring', 'law_enforcement', 'biometric', 'other',
    ];
    const validAutonomy = ['fully_autonomous', 'ai_suggests', 'human_decides'];
    const validDataTypes = ['public_only', 'business_data', 'personal_data', 'sensitive_personal_data'];
    const validPersons = ['employees', 'customers', 'job_applicants', 'patients', 'general_public'];
    const validLocations = ['eu', 'us', 'unknown', 'multiple'];

    const fieldErrors = {};
    if (!validCategories.includes(answers.category)) {
      fieldErrors.category = ['Invalid category'];
    }
    if (!validAutonomy.includes(answers.autonomyLevel)) {
      fieldErrors.autonomyLevel = ['Invalid autonomy level'];
    }
    if (!validDataTypes.includes(answers.dataType)) {
      fieldErrors.dataType = ['Invalid data type'];
    }
    if (!validPersons.includes(answers.affectedPersons)) {
      fieldErrors.affectedPersons = ['Invalid affected persons'];
    }
    if (!validLocations.includes(answers.dataLocation)) {
      fieldErrors.dataLocation = ['Invalid data location'];
    }
    if (Object.keys(fieldErrors).length > 0) {
      throw new errors.ValidationError('Invalid questionnaire answers', fieldErrors);
    }

    // Extract client IP
    const ip = headers['x-forwarded-for']
      ? headers['x-forwarded-for'].split(',')[0].trim()
      : headers['x-real-ip'] || '0.0.0.0';

    // Merge into registry
    const result = await application.registry.mergeUserReport.merge(
      { db, console },
      {
        slug: body.slug,
        url: body.url,
        answers: body.answers,
        scanEvidence: body.scanEvidence || null,
        ip,
        email: body.email || null,
        userId: null,
      },
    );

    return {
      _statusCode: result.action === 'created' ? 201 : 200,
      data: result,
    };
  },
})
