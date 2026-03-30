/**
 * Process Vendor Claim — Use case: manage vendor claim lifecycle.
 *
 * Lifecycle:
 *   1. Vendor submits claim (email on vendor domain)
 *   2. System generates verification challenge (DNS/meta/well-known)
 *   3. Vendor completes verification
 *   4. System or admin verifies
 *   5. Approved → vendor can submit self-report data
 *
 * VM sandbox compatible — IIFE, no require().
 */
(() => {
  return {
    /**
     * Submit a new vendor claim.
     *
     * @param {Object} ctx - { db, console }
     * @param {Object} input - { toolSlug, email, websiteUrl }
     * @param {Object} verifier - vendor-verification domain module instance
     * @returns {{ claimId, token, methods, expiresAt }}
     */
    async submit({ db, console }, input, verifier) {
      const { toolSlug, email, websiteUrl } = input;

      // 1. Check tool exists
      const toolResult = await db.query(
        'SELECT slug, name, website FROM "RegistryTool" WHERE slug = $1',
        [toolSlug],
      );
      if (toolResult.rows.length === 0) {
        throw new Error(`Tool not found: ${toolSlug}`);
      }

      // 2. Check email matches vendor domain
      const tool = toolResult.rows[0];
      const toolUrl = websiteUrl || tool.website;
      if (!verifier.isVendorDomain(email, toolUrl)) {
        throw new Error('Email domain must match the tool vendor domain');
      }

      // 3. Check for existing pending/active claims
      const existingClaim = await db.query(
        `SELECT "vendorClaimId", status FROM "VendorClaim"
         WHERE "toolSlug" = $1 AND status IN ('pending', 'verification_sent', 'verified')
         ORDER BY "createdAt" DESC LIMIT 1`,
        [toolSlug],
      );
      if (existingClaim.rows.length > 0) {
        const existing = existingClaim.rows[0];
        throw new Error(
          `Active claim already exists (status: ${existing.status}). `
          + `Claim ID: ${existing.vendorClaimId}`,
        );
      }

      // 4. Generate verification challenge
      const challenge = verifier.createChallenge(email, toolUrl);

      // 5. Insert claim record
      const insertResult = await db.query(
        `INSERT INTO "VendorClaim"
          ("toolSlug", "vendorEmail", "vendorDomain",
           "verificationToken", "tokenExpiresAt", status)
         VALUES ($1, $2, $3, $4, $5, 'verification_sent')
         RETURNING "vendorClaimId"`,
        [
          toolSlug,
          email,
          challenge.domain,
          challenge.token,
          challenge.expiresAt,
        ],
      );

      const claimId = insertResult.rows[0].vendorClaimId;
      console.log(`Vendor claim created: ${claimId} for ${toolSlug} by ${email}`);

      return {
        claimId,
        token: challenge.token,
        domain: challenge.domain,
        methods: challenge.methods,
        expiresAt: challenge.expiresAt,
      };
    },

    /**
     * Attempt to verify a claim using the selected method.
     *
     * @param {Object} ctx - { db, console }
     * @param {Object} input - { claimId, method }
     * @param {Object} verifier - vendor-verification domain module instance
     * @returns {{ verified, error? }}
     */
    async verify({ db, console }, input, verifier) {
      const { claimId, method } = input;

      // 1. Load claim
      const claimResult = await db.query(
        `SELECT * FROM "VendorClaim" WHERE "vendorClaimId" = $1`,
        [claimId],
      );
      if (claimResult.rows.length === 0) {
        throw new Error(`Claim not found: ${claimId}`);
      }

      const claim = claimResult.rows[0];

      if (claim.status !== 'verification_sent') {
        throw new Error(`Claim not in verifiable state: ${claim.status}`);
      }

      // 2. Check token expiration
      if (new Date(claim.tokenExpiresAt) < new Date()) {
        await db.query(
          `UPDATE "VendorClaim" SET status = 'rejected',
           "rejectionReason" = 'Token expired' WHERE "vendorClaimId" = $1`,
          [claimId],
        );
        throw new Error('Verification token has expired. Please submit a new claim.');
      }

      // 3. Verify
      const result = await verifier.verify(method, claim.vendorDomain, claim.verificationToken);

      if (result.verified) {
        await db.query(
          `UPDATE "VendorClaim"
           SET status = 'verified',
               "verificationMethod" = $1,
               "verifiedAt" = NOW()
           WHERE "vendorClaimId" = $2`,
          [method, claimId],
        );
        console.log(`Vendor claim verified: ${claimId} via ${method}`);
        return { verified: true };
      }

      return { verified: false, error: result.error };
    },

    /**
     * Admin approves a verified claim.
     *
     * @param {Object} ctx - { db, console }
     * @param {Object} input - { claimId, reviewedBy }
     * @returns {{ approved: true, toolSlug }}
     */
    async approve({ db, console }, input) {
      const { claimId, reviewedBy } = input;

      const claimResult = await db.query(
        `SELECT * FROM "VendorClaim" WHERE "vendorClaimId" = $1`,
        [claimId],
      );
      if (claimResult.rows.length === 0) {
        throw new Error(`Claim not found: ${claimId}`);
      }

      const claim = claimResult.rows[0];
      if (claim.status !== 'verified') {
        throw new Error(`Claim must be verified before approval. Current: ${claim.status}`);
      }

      // Update claim
      await db.query(
        `UPDATE "VendorClaim"
         SET status = 'approved',
             "reviewedBy" = $1,
             "reviewedAt" = NOW()
         WHERE "vendorClaimId" = $2`,
        [reviewedBy, claimId],
      );

      // Update RegistryTool
      await db.query(
        `UPDATE "RegistryTool"
         SET "vendorVerified" = true,
             "vendorClaimedAt" = NOW(),
             "trustLevel" = 'vendor_verified'
         WHERE slug = $1`,
        [claim.toolSlug],
      );

      console.log(`Vendor claim approved: ${claimId} for ${claim.toolSlug} by ${reviewedBy}`);

      return { approved: true, toolSlug: claim.toolSlug };
    },

    /**
     * Admin rejects a claim.
     */
    async reject({ db, console }, input) {
      const { claimId, reviewedBy, reason } = input;

      await db.query(
        `UPDATE "VendorClaim"
         SET status = 'rejected',
             "reviewedBy" = $1,
             "reviewedAt" = NOW(),
             "rejectionReason" = $2
         WHERE "vendorClaimId" = $3`,
        [reviewedBy, reason || 'Rejected by admin', claimId],
      );

      console.log(`Vendor claim rejected: ${claimId} by ${reviewedBy}`);
      return { rejected: true };
    },

    /**
     * Get claim status.
     */
    async getStatus({ db }, claimId) {
      const result = await db.query(
        `SELECT "vendorClaimId", "toolSlug", "vendorEmail", "vendorDomain",
                "verificationMethod", status, "verifiedAt",
                "reviewedBy", "reviewedAt", "rejectionReason",
                "createdAt"
         FROM "VendorClaim" WHERE "vendorClaimId" = $1`,
        [claimId],
      );
      return result.rows[0] || null;
    },

    /**
     * List claims for admin review.
     */
    async listPending({ db }) {
      const result = await db.query(
        `SELECT vc."vendorClaimId", vc."toolSlug", vc."vendorEmail",
                vc."vendorDomain", vc.status, vc."verifiedAt", vc."createdAt",
                rt.name AS "toolName"
         FROM "VendorClaim" vc
         LEFT JOIN "RegistryTool" rt ON rt.slug = vc."toolSlug"
         WHERE vc.status IN ('pending', 'verification_sent', 'verified')
         ORDER BY vc."createdAt" DESC`,
      );
      return result.rows;
    },
  };
})()
