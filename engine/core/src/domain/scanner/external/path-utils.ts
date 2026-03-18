/** Normalize a file path from an external tool output relative to projectPath. */
export const normalizeFilePath = (filePath: string, projectPath: string): string => {
  if (filePath.startsWith(projectPath + '/')) {
    return filePath.slice(projectPath.length + 1);
  }
  if (filePath === projectPath) return '.';
  return filePath;
};
