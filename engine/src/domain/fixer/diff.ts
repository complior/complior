export const generateUnifiedDiff = (
  filePath: string,
  oldContent: string,
  newContent: string,
): string => {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');

  const lines: string[] = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
  ];

  // Simple diff: show removed and added lines
  const maxLen = Math.max(oldLines.length, newLines.length);
  let chunkStart = -1;
  let chunkOld: string[] = [];
  let chunkNew: string[] = [];
  let context: string[] = [];

  const flushChunk = (): void => {
    if (chunkOld.length === 0 && chunkNew.length === 0) return;
    const oldStart = Math.max(1, chunkStart - context.length + 1);
    const oldCount = context.length + chunkOld.length;
    const newCount = context.length + chunkNew.length;
    lines.push(`@@ -${oldStart},${oldCount} +${oldStart},${newCount} @@`);
    for (const c of context) lines.push(` ${c}`);
    for (const r of chunkOld) lines.push(`-${r}`);
    for (const a of chunkNew) lines.push(`+${a}`);
    chunkOld = [];
    chunkNew = [];
    context = [];
  };

  for (let i = 0; i < maxLen; i++) {
    const oldLine = i < oldLines.length ? oldLines[i] : undefined;
    const newLine = i < newLines.length ? newLines[i] : undefined;

    if (oldLine === newLine) {
      if (chunkOld.length > 0 || chunkNew.length > 0) {
        flushChunk();
      }
      if (oldLine !== undefined) {
        context = [oldLine];
      }
      chunkStart = i + 1;
    } else {
      if (chunkOld.length === 0 && chunkNew.length === 0) {
        chunkStart = i;
      }
      if (oldLine !== undefined) chunkOld.push(oldLine);
      if (newLine !== undefined) chunkNew.push(newLine);
    }
  }

  flushChunk();

  return lines.join('\n');
};

export const generateCreateDiff = (filePath: string, content: string): string => {
  const lines = content.split('\n');
  const header = [
    `--- /dev/null`,
    `+++ b/${filePath}`,
    `@@ -0,0 +1,${lines.length} @@`,
  ];

  return [...header, ...lines.map((l) => `+${l}`)].join('\n');
};
