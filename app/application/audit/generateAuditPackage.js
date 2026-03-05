({
  generate: async ({ userId, organizationId }) => {
    // 1. Check plan has gapAnalysis feature (Growth+)
    const sub = await db.query(
      `SELECT s.*, p."features"
       FROM "Subscription" s
       JOIN "Plan" p ON p."planId" = s."planId"
       WHERE s."organizationId" = $1
       AND s."status" IN ('active', 'trialing')
       LIMIT 1`,
      [organizationId],
    );

    if (sub.rows.length === 0) {
      throw new errors.NotFoundError('Subscription', organizationId);
    }

    const features = sub.rows[0].features;
    if (!features || (!features.gapAnalysis && !features.all)) {
      throw new errors.PlanLimitError('gapAnalysis', 0, 0);
    }

    // 2. Create AuditPackage record with status 'queued'
    const tq = lib.tenant.createTenantQuery(organizationId);
    const auditPackage = await tq.create('AuditPackage', {
      createdById: userId,
      status: 'queued',
      toolCount: 0,
      documentCount: 0,
    });

    // 3. Enqueue pg-boss job
    const jobId = await pgboss.send('audit-package-generate', {
      auditPackageId: auditPackage.auditPackageId,
      organizationId,
    });

    console.info(`Audit package ${auditPackage.auditPackageId} queued (job: ${jobId})`);

    await lib.audit.createAuditEntry({
      userId,
      organizationId,
      action: 'create',
      resource: 'AuditPackage',
      resourceId: auditPackage.auditPackageId,
      newData: { action: 'generate_queued', jobId },
    });

    return {
      auditPackageId: auditPackage.auditPackageId,
      status: 'queued',
      jobId,
    };
  },

  processPackage: async ({ auditPackageId, organizationId }) => {
    const tq = lib.tenant.createTenantQuery(organizationId);
    const generatedAt = new Date().toISOString().slice(0, 10);

    try {
      // 1. Update status -> 'generating'
      await tq.update('AuditPackage', auditPackageId, { status: 'generating' });

      // 2. Get organization name
      const orgResult = await db.query(
        'SELECT "name" FROM "Organization" WHERE "id" = $1',
        [organizationId],
      );
      const orgName = orgResult.rows[0]?.name || 'Unknown Organization';

      // 3. Get all tools for org
      const toolResult = await tq.findMany('AITool');
      const tools = toolResult.rows;

      // 4. Get all FRIA assessments for org
      const friaResult = await tq.findMany('FRIAAssessment');
      const frias = friaResult.rows;

      // 5. Get all compliance documents for org
      const docResult = await tq.findMany('ComplianceDocument');
      const documents = docResult.rows;

      // 6. Get requirements with tool requirements for obligation matrix
      const reqResult = await db.query(
        `SELECT r.*, tr."aiToolId", tr."status" AS "trStatus"
         FROM "Requirement" r
         LEFT JOIN "ToolRequirement" tr ON tr."requirementId" = r."requirementId"
         LEFT JOIN "AITool" t ON t."aIToolId" = tr."aiToolId" AND t."organizationId" = $1
         ORDER BY r."articleReference", r."name"`,
        [organizationId],
      );

      // Group tool requirements by requirement
      const requirementMap = {};
      for (const row of reqResult.rows) {
        const key = row.requirementId;
        if (!requirementMap[key]) {
          requirementMap[key] = {
            requirementId: row.requirementId,
            name: row.name,
            articleReference: row.articleReference,
            category: row.category,
            toolRequirements: [],
          };
        }
        if (row.aiToolId) {
          requirementMap[key].toolRequirements.push({
            aiToolId: row.aiToolId,
            status: row.trStatus || 'not_applicable',
          });
        }
      }
      const requirements = Object.values(requirementMap);

      // 7. Risk distribution
      const riskDistribution = { prohibited: 0, high: 0, gpai: 0, limited: 0, minimal: 0 };
      for (const tool of tools) {
        if (tool.riskLevel && riskDistribution[tool.riskLevel] !== undefined) {
          riskDistribution[tool.riskLevel]++;
        }
      }

      // 8. Compliance score
      const classifiedWithScore = tools.filter(
        (t) => t.riskLevel && t.complianceScore !== null && t.complianceScore !== undefined,
      );
      const toolScores = classifiedWithScore.map((t) => t.complianceScore ?? 0);
      const complianceScore = domain.classification.services.ComplianceScoreCalculator
        .calculateOrgScore(toolScores);

      // 9. Requirement status summary
      const statusCounts = { completed: 0, in_progress: 0, pending: 0, not_applicable: 0 };
      for (const req of requirements) {
        for (const tr of req.toolRequirements) {
          const s = tr.status || 'not_applicable';
          if (statusCounts[s] !== undefined) statusCounts[s]++;
        }
      }
      const requirementSummary = `Completed: ${statusCounts.completed}, In Progress: ${statusCounts.in_progress}, Pending: ${statusCounts.pending}, N/A: ${statusCounts.not_applicable}`;

      // === Build ZIP contents ===
      const zip = zipBuilder.create();

      // 10. Generate Executive Summary PDF
      const { systemPrompt, userPrompt } = domain.audit.executiveSummaryPrompt
        .build(orgName, tools, riskDistribution, complianceScore, requirementSummary);

      const llmResult = await llm.generateText({
        model: 'doc-writer',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        maxTokens: 1024,
      });

      const summaryHtml = domain.audit.htmlRenderer
        .renderExecutiveSummary(orgName, llmResult.text, generatedAt);
      const summaryPdf = await gotenberg.convertHtmlToPdf(summaryHtml);
      zip.addBuffer('01-executive-summary.pdf', summaryPdf);

      // 11. Generate Obligation Matrix PDF
      const matrixHtml = domain.audit.obligationMatrix.buildHtml(tools, requirements);
      const matrixPageHtml = domain.audit.htmlRenderer
        .renderObligationMatrix(orgName, matrixHtml, generatedAt);
      const matrixPdf = await gotenberg.convertHtmlToPdf(matrixPageHtml);
      zip.addBuffer('02-obligation-matrix.pdf', matrixPdf);

      // 12. Generate AI Registry PDF
      const registryHtml = domain.audit.htmlRenderer
        .renderAIRegistry(orgName, tools, generatedAt);
      const registryPdf = await gotenberg.convertHtmlToPdf(registryHtml);
      zip.addBuffer('03-ai-registry.pdf', registryPdf);

      // 13. Include existing compliance document PDFs
      let downloadedDocCount = 0;
      for (const doc of documents) {
        if (doc.fileUrl) {
          try {
            const stream = await s3.download(doc.fileUrl);
            // Convert readable stream to buffer
            const chunks = [];
            for await (const chunk of stream) {
              chunks.push(chunk);
            }
            const pdfBuffer = Buffer.concat(chunks);
            const slug = (doc.documentType || 'document').replace(/_/g, '-');
            const filename = `documents/${slug}-${doc.complianceDocumentId}.pdf`;
            zip.addBuffer(filename, pdfBuffer);
            downloadedDocCount++;
          } catch (err) {
            console.warn(`Failed to download document ${doc.complianceDocumentId}: ${err.message}`);
          }
        }
      }

      // 14. Include FRIA data as JSON
      if (frias.length > 0) {
        const friaData = frias.map((f) => ({
          id: f.fRIAAssessmentId,
          toolId: f.aiToolId,
          status: f.status,
          createdAt: f.createdAt,
        }));
        zip.addJson('fria/assessments.json', friaData);
      }

      // 15. Build metadata.json
      const metadata = {
        generatedAt: new Date().toISOString(),
        organizationName: orgName,
        organizationId,
        toolCount: tools.length,
        documentCount: downloadedDocCount,
        friaCount: frias.length,
        complianceScore,
        riskDistribution,
        requirementSummary: statusCounts,
        version: '1.0',
        generator: 'Complior AI Act Compliance Platform',
      };
      zip.addJson('metadata.json', metadata);

      // 16. Finalize ZIP
      const zipBuffer = await zip.finalize();

      // 17. Upload ZIP to S3
      const filename = `audit-package-${auditPackageId}.zip`;
      const s3Key = s3.generateKey(organizationId, 'audit-packages', filename);
      await s3.upload(s3Key, zipBuffer, 'application/zip');

      // 18. Set expiry (30 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // 19. Update AuditPackage record
      await tq.update('AuditPackage', auditPackageId, {
        status: 'ready',
        fileUrl: s3Key,
        fileSize: zipBuffer.length,
        toolCount: tools.length,
        documentCount: downloadedDocCount,
        metadata: JSON.stringify(metadata),
        expiresAt: expiresAt.toISOString(),
      });

      // 20. Send email notification
      const creatorResult = await db.query(
        'SELECT "email", "fullName" FROM "User" WHERE "id" = (SELECT "createdById" FROM "AuditPackage" WHERE "auditPackageId" = $1)',
        [auditPackageId],
      );

      if (creatorResult.rows.length > 0) {
        const creator = creatorResult.rows[0];
        try {
          await brevo.sendTransactional({
            to: creator.email,
            subject: `Audit Package Ready - ${orgName}`,
            htmlContent: `<p>Hello ${creator.fullName || 'there'},</p>
              <p>Your AI Act Compliance Audit Package for <strong>${orgName}</strong> is ready for download.</p>
              <p>The package includes:</p>
              <ul>
                <li>Executive Summary</li>
                <li>Obligation Matrix (${tools.length} tools)</li>
                <li>AI System Registry</li>
                <li>${downloadedDocCount} compliance document(s)</li>
                ${frias.length > 0 ? `<li>${frias.length} FRIA assessment(s)</li>` : ''}
              </ul>
              <p>This package will expire on ${expiresAt.toISOString().slice(0, 10)}.</p>
              <p>Log in to your Complior dashboard to download it.</p>
              <p>Best regards,<br>Complior Team</p>`,
          });
        } catch (emailErr) {
          console.warn(`Failed to send audit package notification: ${emailErr.message}`);
        }
      }

      // Audit log for completed package
      const creatorRow = await db.query(
        'SELECT "createdById" FROM "AuditPackage" WHERE "auditPackageId" = $1',
        [auditPackageId],
      );
      const pkgUserId = creatorRow.rows[0]?.createdById;
      if (pkgUserId) {
        await lib.audit.createAuditEntry({
          userId: pkgUserId,
          organizationId,
          action: 'update',
          resource: 'AuditPackage',
          resourceId: auditPackageId,
          newData: { action: 'package_ready', fileSize: zipBuffer.length, toolCount: tools.length },
        });
      }

      console.info(`Audit package ${auditPackageId} ready (${zipBuffer.length} bytes, ${tools.length} tools, ${downloadedDocCount} docs)`);

      return { auditPackageId, status: 'ready', fileSize: zipBuffer.length };
    } catch (err) {
      // On failure, update status to 'error'
      try {
        await tq.update('AuditPackage', auditPackageId, {
          status: 'error',
          errorMessage: String(err.message).slice(0, 1000),
        });
      } catch (updateErr) {
        console.error(`Failed to update audit package ${auditPackageId} error status: ${updateErr.message}`);
      }
      throw err;
    }
  },
})
