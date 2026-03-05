'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const fastify = require('fastify');
const { initRequestId, initErrorHandler, registerSandboxRoutes } = require('../server/src/http.js');
const { buildFullSandbox } = require('./helpers/test-sandbox.js');

// --- Mock Data ---

const MOCK_USER = {
  id: 1,
  organizationId: 10,
  email: 'test@example.com',
  fullName: 'Test User',
  active: true,
  roles: ['owner'],
  locale: 'en',
};

const MOCK_TOOL = {
  aIToolId: 42,
  organizationId: 10,
  createdById: 1,
  name: 'ChatBot Pro',
  vendorName: 'AI Corp',
  purpose: 'Customer support automation',
  domain: 'customer_service',
  riskLevel: 'high',
  dataTypes: ['personal', 'financial'],
  affectedPersons: ['customers', 'employees'],
  autonomyLevel: 'semi_autonomous',
  humanOversight: true,
  affectsNaturalPersons: true,
  complianceStatus: 'in_progress',
  wizardStep: 4,
  wizardCompleted: true,
};

const MOCK_ORG = {
  organizationId: 10,
  name: 'Test Org GmbH',
};

// --- Mock DB ---

const createMockDb = () => {
  const documents = [];
  const sections = [];
  let nextDocId = 1;
  let nextSectionId = 1;

  const permissions = [
    { role: 'owner', resource: 'ComplianceDocument', action: 'manage' },
    { role: 'owner', resource: 'AITool', action: 'manage' },
    { role: 'owner', resource: 'FRIAAssessment', action: 'manage' },
  ];

  return {
    _documents: documents,
    _sections: sections,
    query: async (sql, params) => {
      // Permission queries
      if (sql.includes('FROM "Permission"')) {
        return { rows: permissions };
      }
      // User lookup (resolveSession)
      if (sql.includes('FROM "User"') && sql.includes('workosUserId')) {
        return { rows: [MOCK_USER] };
      }
      if (sql.includes('UPDATE "User"') && sql.includes('lastLoginAt')) {
        return { rows: [], rowCount: 1 };
      }

      // --- Subscription + Plan (plan enforcement) ---
      if (sql.includes('FROM "Subscription"') && sql.includes('JOIN "Plan"')) {
        return {
          rows: [{
            subscriptionId: 1,
            organizationId: 10,
            planId: 3,
            status: 'active',
            features: { documents: 'full', gapAnalysis: true, fria: true },
          }],
        };
      }

      // --- AITool ---
      if (sql.includes('FROM "AITool"') && sql.includes('"aIToolId"')) {
        if (params?.[0] === 42) return { rows: [MOCK_TOOL] };
        return { rows: [] };
      }

      // --- Organization (direct queries only, not JOINs from ComplianceDocument) ---
      if ((sql.includes('FROM "Organization"') || sql.includes('JOIN "Organization"'))
        && !sql.includes('"ComplianceDocument"')) {
        return { rows: [MOCK_ORG] };
      }

      // --- FRIA (for DocumentsTab) ---
      if (sql.includes('FROM "FRIAAssessment"')) {
        return { rows: [] };
      }
      if (sql.includes('FROM "FRIASection"')) {
        return { rows: [] };
      }

      // --- ComplianceDocument: Check existing ---
      if (sql.includes('SELECT "complianceDocumentId" FROM "ComplianceDocument"')
        && sql.includes('status')) {
        const match = documents.find((d) =>
          d.aiToolId === params?.[0] &&
          d.organizationId === params?.[1] &&
          d.documentType === params?.[2] &&
          ['draft', 'generating', 'review'].includes(d.status));
        return { rows: match ? [match] : [] };
      }

      // --- ComplianceDocument: INSERT (via tq.create) ---
      if (sql.includes('INSERT INTO "ComplianceDocument"')) {
        const id = nextDocId++;
        const doc = {
          complianceDocumentId: id,
          aiToolId: params?.[0] || null,
          createdById: params?.[1] || null,
          organizationId: 10,
          documentType: null,
          title: null,
          version: 1,
          status: 'draft',
          fileUrl: null,
          approvedById: null,
          approvedAt: null,
        };
        // Parse INSERT columns from SQL
        const colMatch = sql.match(/\(([^)]+)\)\s*VALUES/);
        if (colMatch) {
          const cols = colMatch[1].replace(/"/g, '').split(',').map((c) => c.trim());
          cols.forEach((col, i) => {
            if (params?.[i] !== undefined) doc[col] = params[i];
          });
        }
        documents.push(doc);
        return { rows: [doc] };
      }

      // --- ComplianceDocument: SELECT list (MUST be first — has COUNT in subquery + LIMIT) ---
      if (sql.includes('FROM "ComplianceDocument" d')
        && sql.includes('JOIN "AITool"')
        && sql.includes('LIMIT')) {
        const filtered = documents.filter((d) => d.organizationId === params?.[0]);
        return {
          rows: filtered.map((d) => ({
            ...d,
            toolName: MOCK_TOOL.name,
            toolRiskLevel: MOCK_TOOL.riskLevel,
            completedSections: sections.filter(
              (s) => s.documentId === d.complianceDocumentId && s.status !== 'empty',
            ).length,
            totalSections: sections.filter(
              (s) => s.documentId === d.complianceDocumentId,
            ).length,
          })),
        };
      }

      // --- ComplianceDocument: COUNT for list (after LIST route — LIST has COUNT in subquery) ---
      if (sql.includes('COUNT') && sql.includes('"ComplianceDocument"')) {
        const filtered = documents.filter((d) => d.organizationId === params?.[0]);
        return { rows: [{ total: filtered.length }] };
      }

      // --- ComplianceDocument: SELECT by ID + JOIN AITool ---
      if (sql.includes('FROM "ComplianceDocument" d')
        && sql.includes('JOIN "AITool"')
        && sql.includes('"complianceDocumentId"')) {
        const doc = documents.find((d) =>
          d.complianceDocumentId === params?.[0] && d.organizationId === params?.[1]);
        if (!doc) return { rows: [] };
        return {
          rows: [{
            ...doc,
            ...MOCK_TOOL,
            // Restore doc fields that might overlap with MOCK_TOOL
            status: doc.status,
            complianceDocumentId: doc.complianceDocumentId,
            documentType: doc.documentType,
            title: doc.title,
            // SQL aliases used by getDocument.js
            toolName: MOCK_TOOL.name,
            toolRiskLevel: MOCK_TOOL.riskLevel,
          }],
        };
      }

      // --- ComplianceDocument: SELECT by ID + JOIN Org ---
      if (sql.includes('FROM "ComplianceDocument" d')
        && sql.includes('JOIN "Organization"')
        && sql.includes('"complianceDocumentId"')) {
        const doc = documents.find((d) =>
          d.complianceDocumentId === params?.[0] && d.organizationId === params?.[1]);
        if (!doc) return { rows: [] };
        return { rows: [{ ...doc, organizationName: 'Test Org GmbH' }] };
      }

      // --- ComplianceDocument: SELECT by ID (simple) ---
      if (sql.includes('FROM "ComplianceDocument"')
        && sql.includes('"complianceDocumentId"')
        && !sql.includes('JOIN')) {
        const doc = documents.find((d) =>
          d.complianceDocumentId === params?.[0] && d.organizationId === params?.[1]);
        return { rows: doc ? [doc] : [] };
      }

      // --- ComplianceDocument: UPDATE status ---
      if (sql.includes('UPDATE "ComplianceDocument"') && sql.includes('status')) {
        const doc = documents.find((d) => d.complianceDocumentId === params?.[1] || d.complianceDocumentId === params?.[0]);
        if (doc) {
          if (sql.includes('"fileUrl"')) {
            doc.fileUrl = params[0];
            doc.status = 'review';
          } else if (sql.includes("'approved'") && sql.includes('"approvedById"')) {
            doc.status = 'approved';
            doc.approvedById = params[0];
            doc.approvedAt = new Date().toISOString();
          } else if (sql.includes("'review'")) {
            doc.status = 'review';
          } else if (sql.includes("'generating'")) {
            doc.status = 'generating';
          }
        }
        return { rows: doc ? [doc] : [], rowCount: doc ? 1 : 0 };
      }

      // --- DocumentSection: INSERT ---
      if (sql.includes('INSERT INTO "DocumentSection"')) {
        const id = nextSectionId++;
        const sec = {
          documentSectionId: id,
          documentId: params?.[0],
          sectionCode: params?.[1],
          title: params?.[2],
          content: typeof params?.[3] === 'string' ? JSON.parse(params[3]) : params?.[3],
          aiDraft: null,
          status: params?.[4] || 'empty',
          sortOrder: params?.[5] || 0,
        };
        sections.push(sec);
        return { rows: [sec] };
      }

      // --- DocumentSection: SELECT by documentId ---
      if (sql.includes('FROM "DocumentSection"')
        && sql.includes('"documentId"')
        && sql.includes('ORDER BY')) {
        const filtered = sections
          .filter((s) => s.documentId === params?.[0])
          .sort((a, b) => a.sortOrder - b.sortOrder);
        return { rows: filtered };
      }

      // --- DocumentSection: SELECT by documentId + sectionCode ---
      if (sql.includes('FROM "DocumentSection"')
        && sql.includes('"sectionCode"')) {
        const sec = sections.find((s) =>
          s.documentId === params?.[0] && s.sectionCode === params?.[1]);
        return { rows: sec ? [sec] : [] };
      }

      // --- DocumentSection: UPDATE ---
      if (sql.includes('UPDATE "DocumentSection"')) {
        let sec;
        if (sql.includes('"aiDraft"')) {
          // generateDraft processGeneration: params = [content, aiDraft, documentId, sectionCode]
          sec = sections.find((s) =>
            s.documentId === params?.[2] && s.sectionCode === params?.[3]);
          if (sec) {
            sec.content = typeof params?.[0] === 'string' ? JSON.parse(params[0]) : params[0];
            sec.aiDraft = typeof params?.[1] === 'string' ? JSON.parse(params[1]) : params[1];
            sec.status = 'ai_generated';
          }
        } else if (sql.includes("'approved'")) {
          // approveSection: params = [documentId, sectionCode]
          sec = sections.find((s) =>
            s.documentId === params?.[0] && s.sectionCode === params?.[1]);
          if (sec) sec.status = 'approved';
        } else if (sql.includes("'reviewed'")) {
          // revokeSection: params = [documentId, sectionCode]
          sec = sections.find((s) =>
            s.documentId === params?.[0] && s.sectionCode === params?.[1] && s.status === 'approved');
          if (sec) sec.status = 'reviewed';
        } else if (sql.includes("'empty'")) {
          // generateDraft mark-as-generating: params = [documentId, sectionCode]
          sec = sections.find((s) =>
            s.documentId === params?.[0] && s.sectionCode === params?.[1]);
          if (sec) sec.status = 'empty';
        } else if (sql.includes('"content"')) {
          // updateSection: params = [content, documentId, sectionCode]
          sec = sections.find((s) =>
            s.documentId === params?.[1] && s.sectionCode === params?.[2]);
          if (sec) {
            sec.content = typeof params?.[0] === 'string' ? JSON.parse(params[0]) : params[0];
            sec.status = 'editing';
          }
        }
        return { rows: sec ? [sec] : [] };
      }

      // --- AuditLog: INSERT ---
      if (sql.includes('INSERT INTO "AuditLog"')) {
        return { rows: [{ auditLogId: 1 }] };
      }

      return { rows: [] };
    },
  };
};

// --- Test Suite ---

describe('Compliance Documents — E2E', () => {
  let server;
  let mockDb;

  before(async () => {
    mockDb = createMockDb();

    const { api } = await buildFullSandbox(mockDb, {
      llm: {
        generateText: async () => ({
          text: 'This is an AI-generated draft section about the AI tool deployment.',
          model: 'mock-doc-writer',
          usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        }),
        provider: null,
        resolveModel: (alias) => alias,
      },
      gotenberg: { convertHtmlToPdf: async (html) => Buffer.from(html, 'utf-8') },
      s3: {
        upload: async () => ({}),
        getSignedUrl: async (key) => `https://s3.example.com/signed/${key}`,
        generateKey: (orgId, type, filename) => `${orgId}/${type}/${filename}`,
      },
    });

    server = fastify({ logger: false });
    initRequestId(server);
    initErrorHandler(server);

    // Inject mock session
    server.addHook('onRequest', (req, _reply, done) => {
      req.session = { user: { id: 'wos-123' } };
      done();
    });

    registerSandboxRoutes(server, { documents: api.documents });
    await server.ready();
  });

  after(async () => {
    await server.close();
  });

  // === 1. Domain Layer Tests ===

  describe('Domain: templates', () => {
    it('returns 7 sections for usage_policy', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('usage_policy');
      assert.strictEqual(sections.length, 7);
      assert.strictEqual(sections[0].sectionCode, 'introduction');
      assert.strictEqual(sections[6].sectionCode, 'monitoring_and_review');
    });

    it('returns 10 sections for qms_template', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('qms_template');
      assert.strictEqual(sections.length, 10);
    });

    it('returns 7 sections for risk_assessment', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('risk_assessment');
      assert.strictEqual(sections.length, 7);
    });

    it('returns 6 sections for monitoring_plan', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('monitoring_plan');
      assert.strictEqual(sections.length, 6);
    });

    it('returns 5 sections for employee_notification', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('employee_notification');
      assert.strictEqual(sections.length, 5);
    });

    it('returns empty array for unknown type', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('unknown_type');
      assert.strictEqual(Array.isArray(sections), true);
      assert.strictEqual(sections.length, 0);
    });

    it('generates correct document title', async () => {
      const { domain } = await buildFullSandbox({});
      assert.strictEqual(
        domain.documents.templates.getDocumentTitle('usage_policy', 'ChatBot'),
        'AI Usage Policy — ChatBot',
      );
      assert.strictEqual(
        domain.documents.templates.getDocumentTitle('employee_notification'),
        'Worker Notification',
      );
    });
  });

  describe('Domain: preFill', () => {
    it('generates pre-filled content for all sections of usage_policy', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('usage_policy');
      const result = domain.documents.preFill.generate(MOCK_TOOL, 'usage_policy', sections);

      assert.strictEqual(result.length, 7);
      assert.strictEqual(result[0].sectionCode, 'introduction');
      assert(result[0].content.text.includes('ChatBot Pro'));
      assert(result[0].content.text.includes('AI Corp'));
    });

    it('includes tool-specific data in pre-filled content', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = domain.documents.templates.getSections('risk_assessment');
      const result = domain.documents.preFill.generate(MOCK_TOOL, 'risk_assessment', sections);

      const execSummary = result.find((s) => s.sectionCode === 'executive_summary');
      assert(execSummary);
      assert(execSummary.content.text.includes('high'));
      assert(execSummary.content.text.includes('customer_service'));
    });

    it('returns empty text for unknown document type', async () => {
      const { domain } = await buildFullSandbox({});
      const sections = [{ sectionCode: 'test_section' }];
      const result = domain.documents.preFill.generate(MOCK_TOOL, 'unknown', sections);
      assert.strictEqual(result[0].content.text, '');
    });
  });

  describe('Domain: prompts', () => {
    it('builds system and user prompts', async () => {
      const { domain } = await buildFullSandbox({});
      const { systemPrompt, userPrompt } = domain.documents.prompts.buildPrompt(
        MOCK_TOOL, 'usage_policy', 'introduction', 'Introduction',
      );

      assert(systemPrompt.includes('EU AI Act'));
      assert(systemPrompt.includes('Introduction'));
      assert(systemPrompt.includes('AI Usage Policy'));
      assert(userPrompt.includes('ChatBot Pro'));
      assert(userPrompt.includes('AI Corp'));
      assert(userPrompt.includes('high'));
    });
  });

  describe('Domain: htmlRenderer', () => {
    it('renders valid HTML with sections', async () => {
      const { domain } = await buildFullSandbox({});
      const doc = { title: 'Test Document' };
      const sections = [
        { sectionCode: 'intro', title: 'Introduction', content: { text: 'Hello world' }, sortOrder: 0 },
        { sectionCode: 'body', title: 'Body', content: { text: 'Main content\nLine 2' }, sortOrder: 1 },
      ];

      const html = domain.documents.htmlRenderer.render(doc, sections, 'Acme Corp');

      assert(html.includes('<!DOCTYPE html>'));
      assert(html.includes('Test Document'));
      assert(html.includes('Acme Corp'));
      assert(html.includes('Introduction'));
      assert(html.includes('Hello world'));
      assert(html.includes('Main content<br/>Line 2'));
      assert(html.includes('complior.eu'));
    });

    it('escapes HTML in content to prevent XSS', async () => {
      const { domain } = await buildFullSandbox({});
      const doc = { title: '<script>alert("xss")</script>' };
      const sections = [
        { sectionCode: 'a', title: 'T', content: { text: '<img onerror="hack">' }, sortOrder: 0 },
      ];

      const html = domain.documents.htmlRenderer.render(doc, sections, '');
      assert(!html.includes('<script>'));
      assert(html.includes('&lt;script&gt;'));
      assert(!html.includes('<img onerror'));
    });
  });

  // === 2. API Endpoint Tests ===

  describe('POST /api/documents — Create', () => {
    it('creates a document with pre-filled sections (201)', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 42, documentType: 'usage_policy' },
      });

      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert(body.complianceDocumentId);
      assert(body.document);
      assert(body.sections);
      assert.strictEqual(body.sections.length, 7);
      assert.strictEqual(body.document.documentType, 'usage_policy');
    });

    it('returns existing document if draft already exists', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 42, documentType: 'usage_policy' },
      });

      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.existing, true);
    });

    it('creates a second doc type for the same tool', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 42, documentType: 'risk_assessment' },
      });

      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.sections.length, 7);
      assert.strictEqual(body.document.documentType, 'risk_assessment');
    });

    it('rejects invalid documentType (400)', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 42, documentType: 'invalid_type' },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects missing toolId (400)', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { documentType: 'usage_policy' },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    it('returns 404 for non-existent tool', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 9999, documentType: 'usage_policy' },
      });

      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('GET /api/documents — List', () => {
    it('returns paginated list of documents', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/documents?toolId=42',
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.data);
      assert(body.pagination);
      assert(body.data.length >= 2); // usage_policy + risk_assessment
      assert.strictEqual(body.pagination.page, 1);
    });

    it('returns all documents without toolId filter', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/documents',
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.data.length >= 2);
    });
  });

  describe('GET /api/documents/:id — Detail', () => {
    it('returns document with sections and tool info', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/documents/1',
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.document);
      assert(body.sections);
      assert(body.tool);
      assert.strictEqual(body.tool.name, 'ChatBot Pro');
    });

    it('returns 404 for non-existent document', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/documents/9999',
      });

      assert.strictEqual(res.statusCode, 404);
    });

    it('rejects invalid ID (400)', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/documents/abc',
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('PUT /api/documents/:id/sections/:sectionCode — Update Section', () => {
    it('updates section content', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: '/api/documents/1/sections/introduction',
        payload: { content: { text: 'Updated introduction text' } },
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.content.text, 'Updated introduction text');
      assert.strictEqual(body.status, 'editing');
    });

    it('rejects invalid content format (400)', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: '/api/documents/1/sections/introduction',
        payload: { content: 'plain string' },
      });

      assert.strictEqual(res.statusCode, 400);
    });

    it('rejects empty body (400)', async () => {
      const res = await server.inject({
        method: 'PUT',
        url: '/api/documents/1/sections/introduction',
        payload: {},
      });

      assert.strictEqual(res.statusCode, 400);
    });
  });

  describe('POST /api/documents/:id/sections/:sectionCode/generate — AI Draft', () => {
    it('generates AI draft for a section', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents/1/sections/introduction/generate',
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.content);
      assert(body.aiDraft);
      assert.strictEqual(body.status, 'ai_generated');
      assert(body.content.text.includes('AI-generated draft'));
    });

    it('returns 404 for non-existent section', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents/1/sections/nonexistent/generate',
      });

      assert.strictEqual(res.statusCode, 404);
    });
  });

  describe('POST /api/documents/:id/export-pdf — PDF Export', () => {
    it('exports document as PDF and returns signed URL', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents/1/export-pdf',
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.fileUrl);
      assert(body.filename);
      assert(body.fileUrl.includes('s3.example.com/signed'));
      assert(body.filename.includes('.pdf'));
    });
  });

  describe('GET /api/documents/:id/download — Download PDF', () => {
    it('returns signed URL for existing PDF', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/documents/1/download',
      });

      assert.strictEqual(res.statusCode, 200);
      const body = JSON.parse(res.payload);
      assert(body.fileUrl);
      assert(body.filename);
      assert(body.filename.endsWith('.pdf'));
    });

    it('returns 404 for non-existent document', async () => {
      const res = await server.inject({
        method: 'GET',
        url: '/api/documents/9999/download',
      });

      assert.strictEqual(res.statusCode, 404);
    });
  });

  // === 3. Full Flow Test ===

  describe('Full E2E Flow: Create → Edit → Generate → Export → Download', () => {
    it('completes the entire document lifecycle', async () => {
      // Step 1: Create monitoring_plan document
      const createRes = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 42, documentType: 'monitoring_plan' },
      });
      assert.strictEqual(createRes.statusCode, 201);
      const created = JSON.parse(createRes.payload);
      const docId = created.complianceDocumentId;
      assert.strictEqual(created.sections.length, 6);

      // Step 2: Get document detail
      const detailRes = await server.inject({
        method: 'GET',
        url: `/api/documents/${docId}`,
      });
      assert.strictEqual(detailRes.statusCode, 200);
      const detail = JSON.parse(detailRes.payload);
      assert.strictEqual(detail.document.status, 'draft');

      // Step 3: Manually edit a section
      const sectionCode = created.sections[0].sectionCode;
      const editRes = await server.inject({
        method: 'PUT',
        url: `/api/documents/${docId}/sections/${sectionCode}`,
        payload: { content: { text: 'Manually written monitoring objectives for ChatBot Pro.' } },
      });
      assert.strictEqual(editRes.statusCode, 200);
      assert.strictEqual(JSON.parse(editRes.payload).status, 'editing');

      // Step 4: Generate AI draft for another section
      const genSectionCode = created.sections[1].sectionCode;
      const genRes = await server.inject({
        method: 'POST',
        url: `/api/documents/${docId}/sections/${genSectionCode}/generate`,
      });
      assert.strictEqual(genRes.statusCode, 200);
      const genBody = JSON.parse(genRes.payload);
      assert.strictEqual(genBody.status, 'ai_generated');
      assert(genBody.aiDraft);

      // Step 5: Export PDF
      const exportRes = await server.inject({
        method: 'POST',
        url: `/api/documents/${docId}/export-pdf`,
      });
      assert.strictEqual(exportRes.statusCode, 200);
      const exportBody = JSON.parse(exportRes.payload);
      assert(exportBody.fileUrl);
      assert(exportBody.filename.includes('monitoring-plan'));

      // Step 6: Download PDF
      const downloadRes = await server.inject({
        method: 'GET',
        url: `/api/documents/${docId}/download`,
      });
      assert.strictEqual(downloadRes.statusCode, 200);
      const dlBody = JSON.parse(downloadRes.payload);
      assert(dlBody.fileUrl);

      // Step 7: Verify in list
      const listRes = await server.inject({
        method: 'GET',
        url: '/api/documents?toolId=42',
      });
      assert.strictEqual(listRes.statusCode, 200);
      const listBody = JSON.parse(listRes.payload);
      const monPlan = listBody.data.find((d) => d.documentType === 'monitoring_plan');
      assert(monPlan);
    });
  });

  // === 4. All 5 Document Types ===

  describe('All 5 document types create successfully', () => {
    it('creates employee_notification with 5 sections', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 42, documentType: 'employee_notification' },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.sections.length, 5);
    });

    it('creates qms_template with 10 sections', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/api/documents',
        payload: { toolId: 42, documentType: 'qms_template' },
      });
      assert.strictEqual(res.statusCode, 201);
      const body = JSON.parse(res.payload);
      assert.strictEqual(body.sections.length, 10);
    });
  });
});
