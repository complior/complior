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
  {
    id: 'system',
    title: 'AI System Type',
    questions: [
      {
        id: 'system_type',
        text: 'What type of AI system are you building?',
        type: 'single',
        options: [
          { value: 'feature', label: 'Feature — AI is one feature of a larger product' },
          { value: 'standalone', label: 'Standalone — dedicated AI application' },
          { value: 'platform', label: 'Platform — hosts multiple AI models/agents' },
          { value: 'internal', label: 'Internal — AI tool for internal use only' },
        ],
        descriptions: {
          feature: 'Most common. Example: chatbot in SaaS, AI-assisted search, recommendation engine.',
          standalone: 'Entire product is AI-powered. Example: AI writing tool, image generator, code assistant.',
          platform: 'You host or orchestrate multiple AI models. Triggers LIMITED risk minimum. Example: LLM gateway, agent framework.',
          internal: 'Not user-facing. May qualify for MINIMAL risk if using public data only.',
        },
        default: 'feature',
      },
      {
        id: 'gpai_model',
        text: 'Does your system use a General-Purpose AI (GPAI) foundation model?',
        type: 'single',
        options: [
          { value: 'yes', label: 'Yes — uses GPT-4, Claude, Gemini, Mistral, or similar' },
          { value: 'no', label: 'No — custom/specialized model only' },
          { value: 'unknown', label: 'Not sure' },
        ],
        descriptions: {
          yes: 'GPAI models trigger 14 additional obligations under Articles 52-56 (transparency, copyright, risk assessment).',
          no: 'Custom or fine-tuned models without a GPAI base. Fewer obligations.',
          unknown: 'We will try to auto-detect from your dependencies.',
        },
        default: 'unknown',
      },
    ],
  },
  {
    id: 'deployment',
    title: 'Deployment Context',
    questions: [
      {
        id: 'user_facing',
        text: 'Does the AI interact directly with end users?',
        type: 'single',
        options: [
          { value: 'yes', label: 'Yes — users see or interact with AI output' },
          { value: 'no', label: 'No — backend/internal processing only' },
        ],
        descriptions: {
          yes: 'Triggers transparency obligations: users must be informed they are interacting with AI (Art. 50).',
          no: 'Fewer transparency requirements, but data governance obligations still apply.',
        },
        default: 'yes',
      },
      {
        id: 'autonomous_decisions',
        text: 'Does the AI make decisions without human review?',
        type: 'single',
        options: [
          { value: 'yes', label: 'Yes — automated decisions affecting people' },
          { value: 'no', label: 'No — human always reviews AI output' },
        ],
        descriptions: {
          yes: 'Strong indicator of HIGH RISK. Requires human oversight mechanisms (Art. 14).',
          no: 'Human-in-the-loop reduces risk classification.',
        },
        default: 'no',
      },
      {
        id: 'biometric_data',
        text: 'Does the AI process biometric identification or categorization data?',
        type: 'single',
        options: [
          { value: 'yes', label: 'Yes — face recognition, fingerprint, voice ID, emotion detection' },
          { value: 'no', label: 'No' },
        ],
        descriptions: {
          yes: 'Biometric AI systems are HIGH RISK or PROHIBITED depending on use case (Art. 5, Annex III).',
        },
        default: 'no',
      },
    ],
  },
];

export const getQuestionBlock = (blockId: string): QuestionBlock | undefined =>
  QUESTION_BLOCKS.find((b) => b.id === blockId);

export const getAllBlockIds = (): readonly string[] =>
  QUESTION_BLOCKS.map((b) => b.id);
