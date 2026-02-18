import simpleGit from 'simple-git';
import { ToolError } from '../types/errors.js';

export interface GitResult {
  readonly action: string;
  readonly data: unknown;
}

export const gitOperation = async (
  action: string,
  args?: Record<string, unknown>,
  cwd?: string,
): Promise<GitResult> => {
  const git = simpleGit(cwd);

  switch (action) {
    case 'status': {
      const status = await git.status();
      return {
        action: 'status',
        data: {
          current: status.current,
          tracking: status.tracking,
          files: status.files.map((f) => ({
            path: f.path,
            index: f.index,
            working_dir: f.working_dir,
          })),
          ahead: status.ahead,
          behind: status.behind,
        },
      };
    }

    case 'diff': {
      const staged = typeof args?.['staged'] === 'boolean' && args['staged'];
      const diff = staged ? await git.diff(['--staged']) : await git.diff();
      return { action: 'diff', data: { diff } };
    }

    case 'log': {
      const maxCount = typeof args?.['maxCount'] === 'number' ? args['maxCount'] : 10;
      const log = await git.log({ maxCount });
      return {
        action: 'log',
        data: {
          all: log.all.map((entry) => ({
            hash: entry.hash,
            date: entry.date,
            message: entry.message,
            author_name: entry.author_name,
          })),
        },
      };
    }

    case 'add': {
      const files = args?.['files'];
      if (Array.isArray(files)) {
        await git.add(files as string[]);
      } else {
        await git.add('.');
      }
      return { action: 'add', data: { success: true } };
    }

    case 'commit': {
      const message = args?.['message'];
      if (typeof message !== 'string' || message.length === 0) {
        throw new ToolError('Commit message is required');
      }
      const result = await git.commit(message);
      return {
        action: 'commit',
        data: { hash: result.commit, summary: result.summary },
      };
    }

    case 'branch': {
      const branches = await git.branch();
      return {
        action: 'branch',
        data: {
          current: branches.current,
          all: branches.all,
        },
      };
    }

    default:
      throw new ToolError(`Unknown git action: ${action}`);
  }
};
