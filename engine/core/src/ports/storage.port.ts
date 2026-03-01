export interface FileSystemPort {
  readonly readFile: (path: string) => Promise<string>;
  readonly writeFile: (path: string, content: string) => Promise<void>;
  readonly readDir: (path: string) => Promise<readonly string[]>;
  readonly exists: (path: string) => Promise<boolean>;
  readonly mkdir: (path: string) => Promise<void>;
}
