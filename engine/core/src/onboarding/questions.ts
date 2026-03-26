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
  /** Per-option explanations (value → description). Shown below the option in interactive CLI. */
  readonly descriptions?: Readonly<Record<string, string>>;
}

export const QUESTION_BLOCKS: readonly QuestionBlock[] = [
  {
    id: 'role',
    title: 'Organization Role',
    questions: [
      {
        id: 'org_role',
        text: 'Your role under EU AI Act?',
        type: 'single',
        options: [
          { value: 'deployer', label: 'Deployer — we USE AI systems' },
          { value: 'provider', label: 'Provider — we BUILD AI systems' },
          { value: 'both', label: 'Both provider and deployer' },
        ],
        descriptions: {
          deployer: 'You integrate AI APIs (OpenAI, Anthropic, Google) or use AI tools. ~10 obligations. Examples: SaaS with AI chatbot, internal AI tool, API-powered feature.',
          provider: 'You develop, train, or rebrand AI systems under your name. ~30 obligations. Examples: AI SaaS product, model hosting, AI API provider. Art.25: if you put your brand on it, you are a provider.',
          both: 'You build your own AI AND use third-party AI. Full obligation set.',
        },
        default: 'deployer',
      },
    ],
  },
  {
    id: 'business',
    title: 'Business Domain',
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
        descriptions: {
          healthcare: 'Triggers HIGH RISK classification under EU AI Act.',
          finance: 'Triggers HIGH RISK classification under EU AI Act.',
          hr: 'Triggers HIGH RISK classification under EU AI Act.',
          education: 'Triggers HIGH RISK classification under EU AI Act.',
        },
        default: 'general',
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
        descriptions: {
          biometric: 'Triggers HIGH RISK classification.',
          health: 'Triggers HIGH RISK classification.',
          financial: 'Triggers HIGH RISK classification.',
        },
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
];

export const getQuestionBlock = (blockId: string): QuestionBlock | undefined =>
  QUESTION_BLOCKS.find((b) => b.id === blockId);

export const getAllBlockIds = (): readonly string[] =>
  QUESTION_BLOCKS.map((b) => b.id);
