import { readFile, readdir, access } from 'node:fs/promises';
import { join } from 'node:path';

export interface AutoDetectResult {
  readonly language: string;
  readonly framework: string;
  readonly cicd: string;
  readonly deployment: string;
  readonly aiLibraries: string[];
  readonly hasDockerCompose: boolean;
  readonly hasEnvExample: boolean;
  readonly detectedModels: string[];
  readonly confidence: number;
}

const fileExists = async (path: string): Promise<boolean> => {
  try { await access(path); return true; } catch { return false; }
};

const detectLanguage = (deps: Record<string, string>): string => {
  if (deps['typescript'] || deps['ts-node'] || deps['tsx']) return 'TypeScript';
  if (deps['@types/node']) return 'TypeScript';
  return 'JavaScript';
};

const detectFramework = (deps: Record<string, string>): string => {
  if (deps['next']) return 'Next.js';
  if (deps['@nestjs/core']) return 'NestJS';
  if (deps['express']) return 'Express';
  if (deps['fastify']) return 'Fastify';
  if (deps['hono']) return 'Hono';
  if (deps['react']) return 'React';
  if (deps['vue']) return 'Vue';
  if (deps['@angular/core']) return 'Angular';
  if (deps['django'] || deps['flask']) return 'Python';
  return 'unknown';
};

const AI_LIBRARIES: ReadonlyMap<string, string> = new Map([
  ['openai', 'OpenAI SDK'],
  ['@anthropic-ai/sdk', 'Anthropic SDK'],
  ['ai', 'Vercel AI SDK'],
  ['@langchain/core', 'LangChain'],
  ['@huggingface/inference', 'Hugging Face'],
  ['replicate', 'Replicate'],
  ['@mistralai/mistralai', 'Mistral'],
  ['@google/generative-ai', 'Google GenAI'],
  ['ollama', 'Ollama'],
  ['cohere-ai', 'Cohere'],
]);

const MODEL_PATTERNS: readonly RegExp[] = [
  /\bgpt-4[a-z0-9-]*/g,
  /\bgpt-3\.5[a-z0-9-]*/g,
  /\bclaude-[a-z0-9.-]*/g,
  /\bgemini-[a-z0-9.-]*/g,
  /\bmistral-[a-z0-9.-]*/g,
];

const detectModels = (sources: readonly string[]): string[] => {
  const models = new Set<string>();
  for (const src of sources) {
    for (const pattern of MODEL_PATTERNS) {
      for (const match of src.matchAll(pattern)) {
        models.add(match[0]);
      }
    }
  }
  return [...models];
};

export const autoDetect = async (projectPath: string): Promise<AutoDetectResult> => {
  let language = 'unknown';
  let framework = 'unknown';
  const aiLibraries: string[] = [];
  let cicd = 'none';
  let deployment = 'unknown';
  let confidence = 0;
  let signals = 0;

  // Package.json
  const pkgPath = join(projectPath, 'package.json');
  const pkgContent = await readFile(pkgPath, 'utf-8').catch(() => null);

  if (pkgContent) {
    const isRec = (v: unknown): v is Record<string, unknown> =>
      typeof v === 'object' && v !== null;
    const raw: unknown = JSON.parse(pkgContent);
    const pkg = isRec(raw) ? raw : {};
    const rawDeps = isRec(pkg['dependencies']) ? pkg['dependencies'] : {};
    const rawDevDeps = isRec(pkg['devDependencies']) ? pkg['devDependencies'] : {};
    const deps: Record<string, string> = {};
    for (const [k, v] of Object.entries({ ...rawDeps, ...rawDevDeps })) {
      if (typeof v === 'string') deps[k] = v;
    }
    language = detectLanguage(deps);
    framework = detectFramework(deps);
    signals += 2;

    for (const [pkg, name] of AI_LIBRARIES) {
      if (deps[pkg]) aiLibraries.push(name);
    }
    if (aiLibraries.length > 0) signals++;
  }

  // Python
  const reqPath = join(projectPath, 'requirements.txt');
  if (!pkgContent && await fileExists(reqPath)) {
    language = 'Python';
    const req = await readFile(reqPath, 'utf-8').catch(() => '');
    if (req.includes('django')) framework = 'Django';
    else if (req.includes('fastapi')) framework = 'FastAPI';
    else if (req.includes('flask')) framework = 'Flask';
    signals++;
  }

  // CI/CD
  const ghActions = join(projectPath, '.github', 'workflows');
  const gitlabCi = join(projectPath, '.gitlab-ci.yml');
  if (await fileExists(ghActions)) { cicd = 'github-actions'; signals++; }
  else if (await fileExists(gitlabCi)) { cicd = 'gitlab-ci'; signals++; }

  // Deployment
  const hasDockerfile = await fileExists(join(projectPath, 'Dockerfile'));
  const hasDockerCompose = await fileExists(join(projectPath, 'docker-compose.yml')) ||
    await fileExists(join(projectPath, 'docker-compose.yaml'));
  const hasVercelJson = await fileExists(join(projectPath, 'vercel.json'));

  if (hasDockerfile) { deployment = 'Docker'; signals++; }
  else if (hasVercelJson) { deployment = 'Vercel'; signals++; }

  const hasEnvExample = await fileExists(join(projectPath, '.env.example')) ||
    await fileExists(join(projectPath, '.env.local'));

  // Model detection from source files
  const srcDirs = ['src', 'app', 'lib', 'pages', 'components'];
  const sourceSnippets: string[] = [];
  for (const dir of srcDirs) {
    const dirPath = join(projectPath, dir);
    const entries = await readdir(dirPath, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.slice(0, 20)) {
      if (entry.isFile() && /\.(ts|tsx|js|jsx|py)$/.test(entry.name)) {
        const content = await readFile(join(dirPath, entry.name), 'utf-8').catch(() => '');
        if (content) sourceSnippets.push(content);
      }
    }
  }
  const detectedModels = detectModels(sourceSnippets);
  if (detectedModels.length > 0) signals++;

  confidence = Math.min(1.0, signals / 6);

  return {
    language,
    framework,
    cicd,
    deployment,
    aiLibraries,
    hasDockerCompose: hasDockerCompose,
    hasEnvExample,
    detectedModels,
    confidence,
  };
};
