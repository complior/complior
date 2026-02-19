import { resolve } from 'node:path';
import { writeFile, chmod, readFile, mkdir } from 'node:fs/promises';

const PRE_COMMIT_TEMPLATE = (threshold: number) => `#!/bin/sh
# Complior pre-commit hook — warns about compliance score (non-blocking)
# Installed by: complior hook install

RESULT=$(npx ai-comply scan --ci --threshold ${threshold} --fail-on critical 2>&1)
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo ""
  echo "⚠ [Complior] Compliance warning:"
  echo "$RESULT"
  echo ""
fi
exit 0
`;

const PRE_PUSH_TEMPLATE = `#!/bin/sh
# Complior pre-push hook — compliance scan report (non-blocking)
# Installed by: complior hook install

RESULT=$(npx ai-comply scan --ci --json 2>&1)
STATUS=$?
if [ $STATUS -ne 0 ]; then
  echo ""
  echo "⚠ [Complior] Compliance issues detected (push continues):"
  echo "$RESULT" | head -20
  echo ""
fi
exit 0
`;

const COMMIT_MSG_TEMPLATE = `#!/bin/sh
# Complior commit-msg hook — appends compliance score to commit messages
# Installed by: complior hook install

SCORE=$(npx ai-comply scan --ci --json 2>/dev/null | grep -o '"score":[0-9]*' | head -1 | cut -d: -f2)
if [ -n "$SCORE" ]; then
  echo "" >> "$1"
  echo "[Complior: $SCORE/100]" >> "$1"
fi
`;

export interface HookConfig {
  readonly threshold: number;
}

const DEFAULT_CONFIG: HookConfig = { threshold: 60 };

export const installHooks = async (
  projectPath: string,
  config?: Partial<HookConfig>,
): Promise<readonly string[]> => {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const hooksDir = resolve(projectPath, '.git', 'hooks');
  await mkdir(hooksDir, { recursive: true });

  const hooks: { name: string; content: string }[] = [
    { name: 'pre-commit', content: PRE_COMMIT_TEMPLATE(cfg.threshold) },
    { name: 'pre-push', content: PRE_PUSH_TEMPLATE },
    { name: 'commit-msg', content: COMMIT_MSG_TEMPLATE },
  ];

  const installed: string[] = [];
  for (const hook of hooks) {
    const hookPath = resolve(hooksDir, hook.name);

    // Backup existing hook
    try {
      const existing = await readFile(hookPath, 'utf-8');
      if (existing && !existing.includes('complior')) {
        await writeFile(`${hookPath}.backup`, existing, 'utf-8');
      }
    } catch {
      // No existing hook
    }

    await writeFile(hookPath, hook.content, 'utf-8');
    await chmod(hookPath, 0o755);
    installed.push(hook.name);
  }

  return installed;
};

export const uninstallHooks = async (projectPath: string): Promise<readonly string[]> => {
  const hooksDir = resolve(projectPath, '.git', 'hooks');
  const hookNames = ['pre-commit', 'pre-push', 'commit-msg'];
  const removed: string[] = [];

  for (const name of hookNames) {
    const hookPath = resolve(hooksDir, name);
    try {
      const content = await readFile(hookPath, 'utf-8');
      if (content.includes('complior')) {
        // Restore backup if exists
        try {
          const backup = await readFile(`${hookPath}.backup`, 'utf-8');
          await writeFile(hookPath, backup, 'utf-8');
        } catch {
          const { unlink } = await import('node:fs/promises');
          await unlink(hookPath);
        }
        removed.push(name);
      }
    } catch {
      // Hook doesn't exist
    }
  }

  return removed;
};
