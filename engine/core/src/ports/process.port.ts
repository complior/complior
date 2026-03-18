/** Contract for running external processes (subprocess execution). */
export type ProcessRunner = (
  cmd: string,
  args: readonly string[],
  options?: { readonly timeout?: number; readonly cwd?: string },
) => Promise<{ readonly stdout: string; readonly stderr: string; readonly exitCode: number }>;
