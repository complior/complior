export type NhiCategory = 'api_key' | 'service_account' | 'secret' | 'token';

export interface NhiPattern {
  readonly id: string;
  readonly name: string;
  readonly category: NhiCategory;
  readonly pattern: RegExp;
  readonly severity: 'critical' | 'high' | 'medium';
  readonly description: string;
}

export const NHI_PATTERNS: readonly NhiPattern[] = [
  // API Keys
  { id: 'nhi-openai-key', name: 'OpenAI API Key', category: 'api_key', pattern: /sk-[a-zA-Z0-9]{20,}/, severity: 'critical', description: 'OpenAI API key detected' },
  { id: 'nhi-anthropic-key', name: 'Anthropic API Key', category: 'api_key', pattern: /sk-ant-[a-zA-Z0-9\-]{20,}/, severity: 'critical', description: 'Anthropic API key detected' },
  { id: 'nhi-aws-access-key', name: 'AWS Access Key', category: 'api_key', pattern: /AKIA[0-9A-Z]{16}/, severity: 'critical', description: 'AWS access key ID detected' },
  { id: 'nhi-github-pat', name: 'GitHub PAT', category: 'api_key', pattern: /ghp_[a-zA-Z0-9]{36}/, severity: 'high', description: 'GitHub personal access token detected' },
  { id: 'nhi-github-oauth', name: 'GitHub OAuth', category: 'api_key', pattern: /gho_[a-zA-Z0-9]{36}/, severity: 'high', description: 'GitHub OAuth token detected' },
  { id: 'nhi-google-api-key', name: 'Google API Key', category: 'api_key', pattern: /AIzaSy[a-zA-Z0-9\-_]{33}/, severity: 'high', description: 'Google API key detected' },
  { id: 'nhi-slack-bot', name: 'Slack Bot Token', category: 'api_key', pattern: /xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{20,}/, severity: 'high', description: 'Slack bot token detected' },
  { id: 'nhi-slack-user', name: 'Slack User Token', category: 'api_key', pattern: /xoxp-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{20,}/, severity: 'high', description: 'Slack user token detected' },
  { id: 'nhi-stripe-key', name: 'Stripe API Key', category: 'api_key', pattern: /sk_live_[a-zA-Z0-9]{24,}/, severity: 'critical', description: 'Stripe live API key detected' },
  { id: 'nhi-sendgrid-key', name: 'SendGrid API Key', category: 'api_key', pattern: /SG\.[a-zA-Z0-9\-_]{22}\.[a-zA-Z0-9\-_]{43}/, severity: 'high', description: 'SendGrid API key detected' },
  { id: 'nhi-twilio-key', name: 'Twilio API Key', category: 'api_key', pattern: /SK[0-9a-fA-F]{32}/, severity: 'high', description: 'Twilio API key detected' },
  // Service Accounts
  { id: 'nhi-gcp-service-account', name: 'GCP Service Account', category: 'service_account', pattern: /"type"\s*:\s*"service_account"/, severity: 'critical', description: 'GCP service account JSON key file detected' },
  // Secrets
  { id: 'nhi-private-key', name: 'Private Key', category: 'secret', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/, severity: 'critical', description: 'Private key detected in source code' },
  { id: 'nhi-aws-secret', name: 'AWS Secret Key', category: 'secret', pattern: /(?:aws_secret_access_key|AWS_SECRET_ACCESS_KEY)\s*[=:]\s*['"]?[A-Za-z0-9/+=]{40}['"]?/, severity: 'critical', description: 'AWS secret access key detected' },
  { id: 'nhi-password-assign', name: 'Hardcoded Password', category: 'secret', pattern: /(?:password|passwd|pwd)\s*[=:]\s*['"][^'"]{8,}['"]/, severity: 'high', description: 'Hardcoded password detected' },
  { id: 'nhi-connection-string', name: 'Connection String', category: 'secret', pattern: /(?:mongodb|postgres|mysql|redis):\/\/[^:]+:[^@]+@[^/\s]+/, severity: 'high', description: 'Database connection string with credentials detected' },
  // Tokens
  { id: 'nhi-jwt', name: 'JWT Token', category: 'token', pattern: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/, severity: 'medium', description: 'JWT token detected in source code' },
  { id: 'nhi-bearer-token', name: 'Bearer Token', category: 'token', pattern: /[Bb]earer\s+[a-zA-Z0-9\-_.~+/]+=*/, severity: 'medium', description: 'Bearer token detected in source code' },
  { id: 'nhi-npm-token', name: 'NPM Token', category: 'token', pattern: /npm_[a-zA-Z0-9]{36}/, severity: 'high', description: 'NPM access token detected' },
  { id: 'nhi-pypi-token', name: 'PyPI Token', category: 'token', pattern: /pypi-[a-zA-Z0-9\-_]{50,}/, severity: 'high', description: 'PyPI access token detected' },
] as const;

// File extensions/paths to skip during NHI scanning
export const NHI_EXCLUDE_PATTERNS = [
  /\.env\.example$/,
  /\.env\.sample$/,
  /\.env\.template$/,
  /\.test\./,
  /\.spec\./,
  /__tests__\//,
  /test\//,
  /tests\//,
  /\.snap$/,
  /\.lock$/,
  /node_modules\//,
  /\.git\//,
  /\.md$/,           // Documentation files (contain example headers/tokens)
  /nhi-patterns\.ts$/, // Self-exclusion (pattern definitions, not real secrets)
  /last-scan\.json$/,  // Cached scan results (contain quoted findings, not real secrets)
  /\.complior\//,      // Complior internal data directory
] as const;

export const shouldScanFile = (path: string): boolean =>
  !NHI_EXCLUDE_PATTERNS.some(p => p.test(path));
