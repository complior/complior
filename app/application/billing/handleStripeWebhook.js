(() => {
  const updateSubscription = async (client, organizationId, fields) => {
    const setClauses = [];
    const values = [];
    let idx = 1;
    for (const [key, value] of Object.entries(fields)) {
      setClauses.push(`"${key}" = $${idx}`);
      values.push(value);
      idx++;
    }
    values.push(organizationId);
    await client.query(
      `UPDATE "Subscription" SET ${setClauses.join(', ')}
       WHERE "organizationId" = $${idx}`,
      values,
    );
  };

  const lookupPlanId = async (client, planName) => {
    const result = await client.query(
      'SELECT "planId" FROM "Plan" WHERE "name" = $1',
      [planName],
    );
    if (result.rows.length === 0) return null;
    return result.rows[0].planId;
  };

  const handleCheckoutCompleted = async (session) => {
    const { organizationId, userId, planName } = session.metadata || {};
    if (!organizationId) return { status: 'ignored', reason: 'no organizationId' };

    const client = await db.connect();
    try {
      await client.query('BEGIN');

      const planId = await lookupPlanId(client, planName);
      if (!planId) {
        await client.query('ROLLBACK');
        return { status: 'error', reason: `plan not found: ${planName}` };
      }

      const sub = session.subscription;
      const fields = {
        planId,
        status: 'trialing',
        stripeCustomerId: session.customer,
        stripeSubscriptionId: typeof sub === 'string' ? sub : sub?.id,
        stripePriceId: session.metadata?.priceId || null,
        billingPeriod: session.metadata?.period || 'monthly',
      };

      if (sub && typeof sub === 'object') {
        if (sub.current_period_start) {
          fields.currentPeriodStart = new Date(sub.current_period_start * 1000);
        }
        if (sub.current_period_end) {
          fields.currentPeriodEnd = new Date(sub.current_period_end * 1000);
        }
        if (sub.trial_end) {
          fields.trialEndsAt = new Date(sub.trial_end * 1000);
        }
      }

      await updateSubscription(client, Number(organizationId), fields);
      await client.query('COMMIT');

      await lib.audit.createAuditEntry({
        userId: userId ? Number(userId) : null,
        organizationId: Number(organizationId),
        action: 'update',
        resource: 'Subscription',
        resourceId: null,
        newData: { event: 'checkout.session.completed', planName },
      });

      return { status: 'processed', event: 'checkout.session.completed' };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  };

  const handleInvoicePaid = async (invoice) => {
    const subId = invoice.subscription;
    if (!subId) return { status: 'ignored', reason: 'no subscription' };

    const result = await db.query(
      `SELECT s."organizationId" FROM "Subscription" s
       WHERE s."stripeSubscriptionId" = $1`,
      [typeof subId === 'string' ? subId : subId?.id],
    );
    if (result.rows.length === 0) return { status: 'ignored', reason: 'subscription not found' };

    const orgId = result.rows[0].organizationId;
    const periodEnd = invoice.lines?.data?.[0]?.period?.end;
    const fields = { status: 'active' };
    if (periodEnd) {
      fields.currentPeriodEnd = new Date(periodEnd * 1000);
    }

    await db.query(
      `UPDATE "Subscription" SET "status" = $1${periodEnd ? ', "currentPeriodEnd" = $2' : ''}
       WHERE "stripeSubscriptionId" = $3`,
      periodEnd
        ? ['active', fields.currentPeriodEnd, typeof subId === 'string' ? subId : subId?.id]
        : ['active', typeof subId === 'string' ? subId : subId?.id],
    );

    await lib.audit.createAuditEntry({
      userId: null,
      organizationId: orgId,
      action: 'update',
      resource: 'Subscription',
      resourceId: null,
      newData: { event: 'invoice.paid' },
    });

    return { status: 'processed', event: 'invoice.paid' };
  };

  const handleInvoicePaymentFailed = async (invoice) => {
    const subId = invoice.subscription;
    if (!subId) return { status: 'ignored', reason: 'no subscription' };

    const stripeSubId = typeof subId === 'string' ? subId : subId?.id;
    const result = await db.query(
      `SELECT s."organizationId" FROM "Subscription" s
       WHERE s."stripeSubscriptionId" = $1`,
      [stripeSubId],
    );
    if (result.rows.length === 0) return { status: 'ignored', reason: 'subscription not found' };

    await db.query(
      'UPDATE "Subscription" SET "status" = $1 WHERE "stripeSubscriptionId" = $2',
      ['past_due', stripeSubId],
    );

    await lib.audit.createAuditEntry({
      userId: null,
      organizationId: result.rows[0].organizationId,
      action: 'update',
      resource: 'Subscription',
      resourceId: null,
      newData: { event: 'invoice.payment_failed' },
    });

    return { status: 'processed', event: 'invoice.payment_failed' };
  };

  const handleSubscriptionDeleted = async (subscription) => {
    const stripeSubId = subscription.id;
    const result = await db.query(
      `SELECT s."organizationId" FROM "Subscription" s
       WHERE s."stripeSubscriptionId" = $1`,
      [stripeSubId],
    );
    if (result.rows.length === 0) return { status: 'ignored', reason: 'subscription not found' };

    await db.query(
      `UPDATE "Subscription" SET "status" = $1, "canceledAt" = NOW()
       WHERE "stripeSubscriptionId" = $2`,
      ['canceled', stripeSubId],
    );

    await lib.audit.createAuditEntry({
      userId: null,
      organizationId: result.rows[0].organizationId,
      action: 'update',
      resource: 'Subscription',
      resourceId: null,
      newData: { event: 'customer.subscription.deleted' },
    });

    return { status: 'processed', event: 'customer.subscription.deleted' };
  };

  return {
    handleEvent: async (event) => {
      switch (event.type) {
      case 'checkout.session.completed':
        return handleCheckoutCompleted(event.data.object);
      case 'invoice.paid':
        return handleInvoicePaid(event.data.object);
      case 'invoice.payment_failed':
        return handleInvoicePaymentFailed(event.data.object);
      case 'customer.subscription.deleted':
        return handleSubscriptionDeleted(event.data.object);
      default:
        return { status: 'ignored', event: event.type };
      }
    },
  };
})()
