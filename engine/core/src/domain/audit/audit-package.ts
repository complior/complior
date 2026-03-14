import { createGzip } from 'node:zlib';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';

// --- Types ---

export interface AuditPackageManifest {
  readonly exportDate: string;
  readonly toolVersion: string;
  readonly files: readonly { path: string; size: number; hash: string }[];
  readonly integrityHash: string;
}

export interface AuditPackageDeps {
  readonly getProjectPath: () => string;
}

export interface AuditPackageResult {
  readonly manifest: AuditPackageManifest;
  readonly buffer: Buffer;
  readonly totalFiles: number;
}

// --- Tar helpers ---

/** Build a POSIX tar header (512 bytes) for a single file entry. */
const tarHeader = (name: string, size: number): Buffer => {
  const header = Buffer.alloc(512, 0);
  // name (100 bytes)
  header.write(name.slice(0, 100), 0, 100, 'utf8');
  // mode (8 bytes)
  header.write('0000644\0', 100, 8, 'utf8');
  // uid (8 bytes)
  header.write('0001000\0', 108, 8, 'utf8');
  // gid (8 bytes)
  header.write('0001000\0', 116, 8, 'utf8');
  // size (12 bytes, octal)
  header.write(size.toString(8).padStart(11, '0') + '\0', 124, 12, 'utf8');
  // mtime (12 bytes, octal)
  const mtime = Math.floor(Date.now() / 1000);
  header.write(mtime.toString(8).padStart(11, '0') + '\0', 136, 12, 'utf8');
  // checksum placeholder (8 spaces)
  header.write('        ', 148, 8, 'utf8');
  // typeflag (regular file)
  header.write('0', 156, 1, 'utf8');

  // Calculate checksum
  let checksum = 0;
  for (let i = 0; i < 512; i++) checksum += header[i];
  header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8, 'utf8');

  return header;
};

/** Pad buffer to 512-byte boundary. */
const padTo512 = (size: number): Buffer => {
  const remainder = size % 512;
  return remainder === 0 ? Buffer.alloc(0) : Buffer.alloc(512 - remainder, 0);
};

/** Recursively collect files from a directory (if it exists). */
const collectFiles = async (
  dir: string,
  basePath: string,
): Promise<{ path: string; content: Buffer }[]> => {
  const files: { path: string; content: Buffer }[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await collectFiles(fullPath, basePath)));
      } else if (entry.isFile()) {
        const content = await readFile(fullPath);
        files.push({ path: relative(basePath, fullPath), content });
      }
    }
  } catch {
    // Directory doesn't exist, skip
  }
  return files;
};

// --- Main export ---

export const createAuditPackage = async (
  deps: AuditPackageDeps,
): Promise<AuditPackageResult> => {
  const projectPath = deps.getProjectPath();
  const compliorDir = join(projectPath, '.complior');

  // Collect artifacts from known locations
  const artifactDirs = [
    join(compliorDir, 'evidence'),
    join(compliorDir, 'agents'),
    join(compliorDir, 'fria'),
    join(compliorDir, 'policies'),
    join(compliorDir, 'audit'),
    join(compliorDir, 'reports'),
    join(compliorDir, 'exports'),
  ];

  const allFiles: { path: string; content: Buffer }[] = [];

  for (const dir of artifactDirs) {
    allFiles.push(...(await collectFiles(dir, compliorDir)));
  }

  // Also try to add the latest scan result if it exists
  try {
    const scanPath = join(compliorDir, 'last-scan.json');
    const scanContent = await readFile(scanPath);
    allFiles.push({ path: 'last-scan.json', content: scanContent });
  } catch {
    // No scan result, skip
  }

  // Build manifest
  const manifestFiles = allFiles.map((f) => ({
    path: f.path,
    size: f.content.length,
    hash: createHash('sha256').update(f.content).digest('hex'),
  }));

  const integrityHash = createHash('sha256')
    .update(manifestFiles.map((f) => f.hash).join(''))
    .digest('hex');

  const manifest: AuditPackageManifest = {
    exportDate: new Date().toISOString(),
    toolVersion: '8.0.0',
    files: manifestFiles,
    integrityHash,
  };

  // Add manifest to the archive
  const manifestBuffer = Buffer.from(JSON.stringify(manifest, null, 2));
  allFiles.push({ path: 'audit-manifest.json', content: manifestBuffer });

  // Build tar archive
  const tarChunks: Buffer[] = [];
  for (const file of allFiles) {
    const entryPath = `complior-audit/${file.path}`;
    tarChunks.push(tarHeader(entryPath, file.content.length));
    tarChunks.push(file.content);
    tarChunks.push(padTo512(file.content.length));
  }
  // End of archive marker (two 512-byte zero blocks)
  tarChunks.push(Buffer.alloc(1024, 0));

  const tarBuffer = Buffer.concat(tarChunks);

  // Gzip compress
  const gzipped = await new Promise<Buffer>((resolve, reject) => {
    const gzip = createGzip({ level: 9 });
    const chunks: Buffer[] = [];
    gzip.on('data', (chunk: Buffer) => chunks.push(chunk));
    gzip.on('end', () => resolve(Buffer.concat(chunks)));
    gzip.on('error', reject);
    gzip.end(tarBuffer);
  });

  return { manifest, buffer: gzipped, totalFiles: allFiles.length };
};
