({
  deleteAccount: async ({ userId, organizationId, oryId }) => {
    const deletedEmail = `deleted_${userId}@deleted.local`;

    await db.query(
      `UPDATE "User"
       SET "email" = $1,
           "fullName" = '[DELETED]',
           "active" = false,
           "updatedAt" = NOW()
       WHERE "id" = $2 AND "organizationId" = $3`,
      [deletedEmail, userId, organizationId],
    );

    try {
      await ory.deleteIdentity(oryId);
    } catch (err) {
      console.warn('Failed to delete Ory identity (may already be deleted):', err.message);
    }

    await db.query(
      `INSERT INTO "AuditLog" ("organizationId", "userId", "action", "resource", "details", "createdAt")
       VALUES ($1, $2, 'delete', 'User', $3, NOW())`,
      [organizationId, userId, JSON.stringify({ reason: 'GDPR Art. 17 — Right to erasure' })],
    );

    return { deleted: true };
  },
})
