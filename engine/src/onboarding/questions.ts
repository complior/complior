export interface QuestionOption {
  readonly value: string;
  readonly label: string;
}

export interface QuestionBlock {
  readonly id: string;
  readonly title: string;
  readonly questions: readonly Question[];
}

export interface Question {
  readonly id: string;
  readonly text: string;
  readonly type: 'single' | 'multi' | 'text';
  readonly options?: readonly QuestionOption[];
  readonly default?: string;
}

export const QUESTION_BLOCKS: readonly QuestionBlock[] = [
  {
    id: 'ai_system',
    title: 'AI System',
    questions: [
      {
        id: 'system_type',
        text: 'What type of AI system are you building?',
        type: 'single',
        options: [
          { value: 'feature', label: 'AI-powered feature in a larger app (chatbot, recommendation)' },
          { value: 'standalone', label: 'Standalone AI product (SaaS AI tool)' },
          { value: 'platform', label: 'AI API/Platform (model hosting, MLOps)' },
          { value: 'internal', label: 'Internal AI tool (not customer-facing)' },
        ],
        default: 'feature',
      },
      {
        id: 'output_types',
        text: 'What does your AI output?',
        type: 'multi',
        options: [
          { value: 'text', label: 'Text/Chat responses' },
          { value: 'images', label: 'Generated images' },
          { value: 'audio', label: 'Audio/Speech' },
          { value: 'code', label: 'Code generation' },
          { value: 'decisions', label: 'Automated decisions' },
          { value: 'recommendations', label: 'Recommendations' },
        ],
      },
    ],
  },
  {
    id: 'jurisdiction',
    title: 'Jurisdiction',
    questions: [
      {
        id: 'primary_jurisdiction',
        text: 'Primary jurisdiction for compliance?',
        type: 'single',
        options: [
          { value: 'EU', label: 'European Union (EU AI Act)' },
          { value: 'UK', label: 'United Kingdom' },
          { value: 'US', label: 'United States' },
          { value: 'global', label: 'Global (all major jurisdictions)' },
        ],
        default: 'EU',
      },
    ],
  },
  {
    id: 'role',
    title: 'Organization Role',
    questions: [
      {
        id: 'org_role',
        text: 'Your organization\'s role under AI Act?',
        type: 'single',
        options: [
          { value: 'provider', label: 'Provider — develop/train the AI system' },
          { value: 'deployer', label: 'Deployer — use AI system in production' },
          { value: 'both', label: 'Both provider and deployer' },
        ],
        default: 'deployer',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business Context',
    questions: [
      {
        id: 'domain',
        text: 'Primary business domain?',
        type: 'single',
        options: [
          { value: 'general', label: 'General / SaaS' },
          { value: 'healthcare', label: 'Healthcare / Medical' },
          { value: 'finance', label: 'Finance / Insurance' },
          { value: 'hr', label: 'HR / Employment' },
          { value: 'education', label: 'Education' },
          { value: 'content', label: 'Content Generation' },
          { value: 'customer_service', label: 'Customer Service' },
        ],
        default: 'general',
      },
      {
        id: 'company_size',
        text: 'Company size?',
        type: 'single',
        options: [
          { value: 'startup', label: 'Startup (< 50 employees)' },
          { value: 'sme', label: 'SME (50-250 employees)' },
          { value: 'enterprise', label: 'Enterprise (250+ employees)' },
        ],
        default: 'startup',
      },
    ],
  },
  {
    id: 'data',
    title: 'Data Handling',
    questions: [
      {
        id: 'data_types',
        text: 'What types of data does your AI process?',
        type: 'multi',
        options: [
          { value: 'personal', label: 'Personal data (names, emails)' },
          { value: 'biometric', label: 'Biometric data' },
          { value: 'health', label: 'Health/Medical data' },
          { value: 'financial', label: 'Financial data' },
          { value: 'public', label: 'Public/Open data only' },
        ],
      },
      {
        id: 'data_storage',
        text: 'Where is data stored?',
        type: 'single',
        options: [
          { value: 'eu', label: 'EU only' },
          { value: 'us', label: 'US only' },
          { value: 'mixed', label: 'Mixed / Multi-region' },
        ],
        default: 'eu',
      },
    ],
  },
  {
    id: 'goals',
    title: 'Compliance Goals',
    questions: [
      {
        id: 'priority',
        text: 'Top compliance priority?',
        type: 'single',
        options: [
          { value: 'risk_classification', label: 'Understand my risk level' },
          { value: 'documentation', label: 'Generate required documents' },
          { value: 'monitoring', label: 'Set up monitoring & reporting' },
          { value: 'full', label: 'Full compliance assessment' },
        ],
        default: 'full',
      },
      {
        id: 'budget',
        text: 'Compliance effort budget?',
        type: 'single',
        options: [
          { value: 'minimal', label: 'Minimal — quick fixes only' },
          { value: 'moderate', label: 'Moderate — key gaps' },
          { value: 'full', label: 'Full — comprehensive compliance' },
        ],
        default: 'moderate',
      },
    ],
  },
];

export const getQuestionBlock = (blockId: string): QuestionBlock | undefined =>
  QUESTION_BLOCKS.find((b) => b.id === blockId);

export const getAllBlockIds = (): readonly string[] =>
  QUESTION_BLOCKS.map((b) => b.id);
