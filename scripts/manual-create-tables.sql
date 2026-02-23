-- Manual table creation (bypassing MetaSQL)
-- This is a workaround for MetaSQL Entity column conflicts

-- Drop existing tables
DROP TABLE IF EXISTS "Obligation" CASCADE;
DROP TABLE IF EXISTS "RegistryTool" CASCADE;

-- Create Obligation table with all enhanced fields
CREATE TABLE "Obligation" (
  "obligationId" BIGSERIAL PRIMARY KEY,
  "obligationIdUnique" VARCHAR(50) UNIQUE NOT NULL,  -- The actual unique key from ~/complior

  -- Legacy fields
  "code" VARCHAR(255),
  "regulation" VARCHAR(100),

  -- Core fields
  "articleReference" VARCHAR(100) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,

  -- Applicability
  "appliesToRole" VARCHAR(20) NOT NULL CHECK ("appliesToRole" IN ('provider', 'deployer', 'both')),
  "appliesToRiskLevel" JSONB,

  -- Classification
  "obligationType" VARCHAR(100),
  "severity" VARCHAR(10) NOT NULL CHECK ("severity" IN ('critical', 'high', 'medium', 'low')),
  "category" VARCHAR(50),

  -- Action guidance
  "whatToDo" JSONB,
  "whatNotToDo" JSONB,
  "evidenceRequired" TEXT,

  -- Timeline
  "deadline" VARCHAR(100),
  "frequency" VARCHAR(100),
  "penaltyForNonCompliance" TEXT,

  -- Automation
  "automatable" VARCHAR(10) CHECK ("automatable" IN ('full', 'partial', 'manual')),
  "automationApproach" TEXT,
  "cliCheckPossible" BOOLEAN DEFAULT FALSE,
  "cliCheckDescription" TEXT,

  -- Templates & Features
  "documentTemplateNeeded" BOOLEAN DEFAULT FALSE,
  "documentTemplateType" VARCHAR(100),
  "sdkFeatureNeeded" BOOLEAN DEFAULT FALSE,

  -- Hierarchy
  "parentObligation" VARCHAR(50),

  -- Legacy
  "checkCriteria" JSONB,
  "sortOrder" INTEGER DEFAULT 0,
  "riskLevel" VARCHAR(20)
);

-- Create RegistryTool table with all enhanced fields
CREATE TABLE "RegistryTool" (
  "registryToolId" BIGSERIAL PRIMARY KEY,
  "slug" VARCHAR(100) UNIQUE NOT NULL,

  -- Core fields
  "name" VARCHAR(255) NOT NULL,
  "provider" JSONB,
  "website" VARCHAR(500),
  "categories" JSONB,
  "description" TEXT,

  -- Source tracking
  "source" VARCHAR(100),
  "rankOnSource" INTEGER,

  -- Quality level
  "level" VARCHAR(20) DEFAULT 'classified' CHECK ("level" IN ('classified', 'scanned', 'verified')),
  "priorityScore" INTEGER DEFAULT 0,

  -- Evidence & Assessments
  "evidence" JSONB,
  "assessments" JSONB,

  -- SEO
  "seo" JSONB,

  -- Legacy fields
  "category" VARCHAR(50),
  "riskLevel" VARCHAR(20),
  "websiteUrl" VARCHAR(500),
  "vendorCountry" CHAR(2),
  "dataResidency" VARCHAR(100),
  "capabilities" JSONB,
  "jurisdictions" JSONB,
  "detectionPatterns" JSONB,
  "active" BOOLEAN DEFAULT TRUE
);

-- Add indexes
CREATE INDEX "idx_obligation_role" ON "Obligation" ("appliesToRole");
CREATE INDEX "idx_obligation_severity" ON "Obligation" ("severity");
CREATE INDEX "idx_registrytool_level" ON "RegistryTool" ("level");
CREATE INDEX "idx_registrytool_source" ON "RegistryTool" ("source");
