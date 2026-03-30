/**
 * Vendor Report API — Verified vendors submit self-report data.
 *
 * POST /api/public/registry/vendor-report
 *   Body: { toolSlug, email, vendorReport }
 *   Returns: { updated, toolSlug }
 *
 * Requires an approved VendorClaim for the tool.
 */
({
  access: 'public',
  httpMethod: 'POST',
  path: '/api/public/registry/vendor-report',

  method: async ({ body }) => {
    if (!body || !body.toolSlug || !body.email || !body.vendorReport) {
      throw new errors.ValidationError('Missing required fields', {
        toolSlug: !body || !body.toolSlug ? ['Tool slug is required'] : [],
        email: !body || !body.email ? ['Email is required'] : [],
        vendorReport: !body || !body.vendorReport ? ['Vendor report data is required'] : [],
      });
    }

    const { toolSlug, email, vendorReport } = body;

    // 1. Verify approved claim exists for this vendor + tool
    const claimResult = await db.query(
      `SELECT "vendorClaimId", "vendorEmail", status
       FROM "VendorClaim"
       WHERE "toolSlug" = $1 AND status = 'approved'
       ORDER BY "reviewedAt" DESC LIMIT 1`,
      [toolSlug],
    );

    if (claimResult.rows.length === 0) {
      throw new errors.ForbiddenError(
        'No approved vendor claim found. You must first claim and verify ownership.',
      );
    }

    const claim = claimResult.rows[0];

    // Verify email matches the approved claim
    if (claim.vendorEmail.toLowerCase() !== email.toLowerCase()) {
      throw new errors.ForbiddenError(
        'Email does not match the approved vendor claim.',
      );
    }

    // 2. Validate vendor report fields
    const validReport = {};
    const allowedFields = [
      'data_residency', 'data_residency_details',
      'model_provider', 'model_id',
      'autonomy_level', 'human_oversight', 'human_oversight_details',
      'transparency_url', 'privacy_url', 'terms_url',
      'ai_act_compliance_status', 'compliance_contact',
      'technical_documentation_url',
      'last_audit_date', 'certifications',
    ];

    for (const field of allowedFields) {
      if (vendorReport[field] !== undefined) {
        validReport[field] = vendorReport[field];
      }
    }

    validReport.submitted_at = new Date().toISOString();
    validReport.submitted_by = email;

    // 3. Update RegistryTool with vendor report
    await db.query(
      `UPDATE "RegistryTool"
       SET "vendorReport" = $1,
           "vendorVerified" = true,
           "trustLevel" = 'vendor_verified'
       WHERE slug = $2`,
      [JSON.stringify(validReport), toolSlug],
    );

    // 4. Update VendorClaim with submitted data
    await db.query(
      `UPDATE "VendorClaim"
       SET "submittedData" = $1
       WHERE "vendorClaimId" = $2`,
      [JSON.stringify(validReport), claim.vendorClaimId],
    );

    console.log(`Vendor report submitted for ${toolSlug} by ${email}`);

    return {
      data: {
        updated: true,
        toolSlug,
        fieldsSubmitted: Object.keys(validReport).length,
      },
    };
  },
})
