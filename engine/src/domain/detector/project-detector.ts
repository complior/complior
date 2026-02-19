import { readFile, readdir, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import type { ProjectProfile } from '../../types/common.types.js';
import { detectFrameworks, detectAiTools, detectModelsInSource } from './framework-detector.js';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage']);
const MAX_FILE_SIZE = 512 * 1024; // 512KB
const MAX_FILES = 200;

const collectSourceFiles = async (dir: string, collected: string[] = []): Promise<readonly string[]> => {
  if (collected.length >= MAX_FILES) return collected;

  const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);

  for (const entry of entries) {
    if (collected.length >= MAX_FILES) break;

    if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name)) {
      await collectSourceFiles(join(dir, entry.name), collected);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name))) {
      collected.push(join(dir, entry.name));
    }
  }

  return collected;
};

const readFileContents = async (filePaths: readonly string[]): Promise<readonly string[]> => {
  const contents: string[] = [];

  for (const filePath of filePaths) {
    const fileStat = await stat(filePath).catch(() => null);
    if (fileStat !== null && fileStat.size <= MAX_FILE_SIZE) {
      const content = await readFile(filePath, 'utf-8').catch(() => '');
      if (content.length > 0) {
        contents.push(content);
      }
    }
  }

  return contents;
};

export const detectProject = async (projectPath: string): Promise<ProjectProfile> => {
  const packageJsonPath = join(projectPath, 'package.json');
  const packageJsonContent = await readFile(packageJsonPath, 'utf-8').catch(() => null);

  if (packageJsonContent === null) {
    return {
      frameworks: [],
      aiTools: [],
      languages: [],
      hasPackageJson: false,
      detectedModels: [],
    };
  }

  const packageJson = JSON.parse(packageJsonContent) as {
    readonly dependencies?: Readonly<Record<string, string>>;
    readonly devDependencies?: Readonly<Record<string, string>>;
  };

  const allDeps: Record<string, string> = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const frameworks = detectFrameworks(allDeps);
  const aiTools = detectAiTools(allDeps);

  const sourceFiles = await collectSourceFiles(projectPath);
  const fileContents = await readFileContents(sourceFiles);
  const detectedModels = detectModelsInSource(fileContents);

  const languages: string[] = [];
  if (allDeps['typescript'] !== undefined) {
    languages.push('TypeScript');
  }
  languages.push('JavaScript');

  return {
    frameworks,
    aiTools,
    languages,
    hasPackageJson: true,
    detectedModels,
  };
};
