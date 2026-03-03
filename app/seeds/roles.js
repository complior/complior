'use strict';

const roles = [
  { name: 'owner', active: true, organizationId: null },
  { name: 'admin', active: true, organizationId: null },
  { name: 'member', active: true, organizationId: null },
  { name: 'viewer', active: true, organizationId: null },
  { name: 'platform_admin', active: true, organizationId: null },
];

const permissions = [
  // Owner — full access
  { role: 'owner', resource: 'Organization', action: 'manage' },
  { role: 'owner', resource: 'User', action: 'manage' },
  { role: 'owner', resource: 'Invitation', action: 'manage' },
  { role: 'owner', resource: 'AITool', action: 'manage' },
  { role: 'owner', resource: 'RiskClassification', action: 'manage' },
  { role: 'owner', resource: 'ComplianceDocument', action: 'manage' },
  { role: 'owner', resource: 'FRIAAssessment', action: 'manage' },
  { role: 'owner', resource: 'TrainingCourse', action: 'manage' },
  { role: 'owner', resource: 'LiteracyCompletion', action: 'manage' },
  { role: 'owner', resource: 'Subscription', action: 'manage' },
  { role: 'owner', resource: 'AuditLog', action: 'read' },
  { role: 'owner', resource: 'Notification', action: 'manage' },
  { role: 'owner', resource: 'Conversation', action: 'manage' },

  { role: 'owner', resource: 'ApiKey', action: 'manage' },

  // Admin — manage tools + compliance + team, no billing
  { role: 'admin', resource: 'ApiKey', action: 'manage' },
  { role: 'admin', resource: 'AITool', action: 'manage' },
  { role: 'admin', resource: 'RiskClassification', action: 'manage' },
  { role: 'admin', resource: 'ComplianceDocument', action: 'manage' },
  { role: 'admin', resource: 'FRIAAssessment', action: 'manage' },
  { role: 'admin', resource: 'TrainingCourse', action: 'manage' },
  { role: 'admin', resource: 'LiteracyCompletion', action: 'manage' },
  { role: 'admin', resource: 'User', action: 'manage' },
  { role: 'admin', resource: 'Invitation', action: 'manage' },
  { role: 'admin', resource: 'Organization', action: 'read' },
  { role: 'admin', resource: 'AuditLog', action: 'read' },
  { role: 'admin', resource: 'Notification', action: 'manage' },
  { role: 'admin', resource: 'Conversation', action: 'manage' },

  // Member — create + read, limited update
  { role: 'member', resource: 'AITool', action: 'create' },
  { role: 'member', resource: 'AITool', action: 'read' },
  { role: 'member', resource: 'AITool', action: 'update' },
  { role: 'member', resource: 'RiskClassification', action: 'read' },
  { role: 'member', resource: 'ComplianceDocument', action: 'create' },
  { role: 'member', resource: 'ComplianceDocument', action: 'read' },
  { role: 'member', resource: 'FRIAAssessment', action: 'create' },
  { role: 'member', resource: 'FRIAAssessment', action: 'read' },
  { role: 'member', resource: 'FRIAAssessment', action: 'update' },
  { role: 'member', resource: 'TrainingCourse', action: 'read' },
  { role: 'member', resource: 'LiteracyCompletion', action: 'read' },
  { role: 'member', resource: 'Notification', action: 'read' },
  { role: 'member', resource: 'Conversation', action: 'create' },
  { role: 'member', resource: 'Conversation', action: 'read' },

  // Platform Admin — cross-org read access
  { role: 'platform_admin', resource: 'PlatformAdmin', action: 'manage' },

  // Viewer — read-only
  { role: 'viewer', resource: 'AITool', action: 'read' },
  { role: 'viewer', resource: 'RiskClassification', action: 'read' },
  { role: 'viewer', resource: 'ComplianceDocument', action: 'read' },
  { role: 'viewer', resource: 'FRIAAssessment', action: 'read' },
  { role: 'viewer', resource: 'TrainingCourse', action: 'read' },
  { role: 'viewer', resource: 'LiteracyCompletion', action: 'read' },
  { role: 'viewer', resource: 'Notification', action: 'read' },
];

module.exports = { roles, permissions };
