import { createFile, editFile, readFile, listFiles } from '../coding/file-ops.js';
import { search } from '../coding/search.js';
import type { EventBusPort } from '../ports/events.port.js';

export interface FileServiceDeps {
  readonly events: EventBusPort;
}

export const createFileService = (deps: FileServiceDeps) => {
  const { events } = deps;

  const create = async (path: string, content: string): Promise<void> => {
    await createFile(path, content);
    events.emit('file.changed', { path, action: 'create' });
  };

  const edit = async (path: string, oldContent: string, newContent: string): Promise<void> => {
    await editFile(path, oldContent, newContent);
    events.emit('file.changed', { path, action: 'edit' });
  };

  const read = async (path: string): Promise<string> => {
    return readFile(path);
  };

  const list = async (dirPath: string, pattern?: string): Promise<readonly string[]> => {
    return listFiles(dirPath, pattern);
  };

  const searchCode = async (pattern: string, searchPath: string) => {
    return search(pattern, searchPath);
  };

  return Object.freeze({ create, edit, read, list, searchCode });
};

export type FileService = ReturnType<typeof createFileService>;
