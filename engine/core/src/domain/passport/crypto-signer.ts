import {
  generateKeyPairSync,
  createPrivateKey,
  createPublicKey,
  sign,
  verify,
  createHash,
} from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { AgentManifest, SignatureBlock } from '../../types/passport.types.js';

// --- Key constants ---

const DEFAULT_KEYS_DIR = join(homedir(), '.config', 'complior', 'keys');
const PRIVATE_KEY_FILE = 'complior-ed25519.key';
const PUBLIC_KEY_FILE = 'complior-ed25519.pub';

// --- Key pair generation ---

export const generateKeyPair = (): {
  publicKey: string;
  privateKey: string;
} => {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519', {
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  return { publicKey, privateKey };
};

// --- Key pair persistence ---

export const loadOrCreateKeyPair = async (
  keysDir?: string,
): Promise<{ publicKey: string; privateKey: string }> => {
  const dir = keysDir ?? DEFAULT_KEYS_DIR;
  const privatePath = join(dir, PRIVATE_KEY_FILE);
  const publicPath = join(dir, PUBLIC_KEY_FILE);

  try {
    const [privateKey, publicKey] = await Promise.all([
      readFile(privatePath, 'utf-8'),
      readFile(publicPath, 'utf-8'),
    ]);
    return { publicKey, privateKey };
  } catch {
    // Keys don't exist, generate new ones
    const keyPair = generateKeyPair();

    await mkdir(dir, { recursive: true });
    await writeFile(privatePath, keyPair.privateKey, { mode: 0o600 });
    await writeFile(publicPath, keyPair.publicKey);

    return keyPair;
  }
};

// --- Canonical payload ---

const buildCanonicalPayload = (
  agentId: string,
  permissions: unknown,
  constraints: unknown,
  compliance: unknown,
  timestamp: string,
): string => {
  const payload = {
    agent_id: agentId,
    compliance,
    constraints,
    permissions,
    timestamp,
  };
  return JSON.stringify(payload, Object.keys(payload).sort());
};

// --- Public key extraction from private key ---

const extractPublicKeyBase64 = (privateKeyPem: string): string => {
  const privKeyObject = createPrivateKey(privateKeyPem);
  const pubKeyObject = createPublicKey(privKeyObject);
  const derBuffer = pubKeyObject.export({ type: 'spki', format: 'der' });
  return Buffer.from(derBuffer).toString('base64');
};

// --- Manifest signing ---

export const signManifest = (
  manifest: Omit<AgentManifest, 'signature'>,
  privateKey: string,
): SignatureBlock => {
  const timestamp = new Date().toISOString();

  // 1. Build canonical payload with sorted keys
  const canonical = buildCanonicalPayload(
    manifest.agent_id,
    manifest.permissions,
    manifest.constraints,
    manifest.compliance,
    timestamp,
  );

  // 2. SHA-256 hash of canonical payload
  const hash = createHash('sha256').update(canonical).digest('hex');

  // 3. Sign canonical payload with ed25519 (no hash algorithm needed for ed25519)
  const signatureBytes = sign(null, Buffer.from(canonical), privateKey);

  // 4. Extract public key as base64 of DER-encoded public key
  const publicKeyBase64 = extractPublicKeyBase64(privateKey);

  return {
    algorithm: 'ed25519',
    public_key: publicKeyBase64,
    signed_at: timestamp,
    hash: 'sha256:' + hash,
    value: Buffer.from(signatureBytes).toString('base64'),
  };
};

// --- Manifest verification ---

export const verifyManifest = (manifest: AgentManifest): boolean => {
  try {
    const { signature } = manifest;

    // 1. Rebuild canonical payload using signed_at from signature
    const canonical = buildCanonicalPayload(
      manifest.agent_id,
      manifest.permissions,
      manifest.constraints,
      manifest.compliance,
      signature.signed_at,
    );

    // 2. Verify hash integrity
    const expectedHash =
      'sha256:' + createHash('sha256').update(canonical).digest('hex');
    if (signature.hash !== expectedHash) return false;

    // 3. Reconstruct public key from base64 DER
    const derBuffer = Buffer.from(signature.public_key, 'base64');
    const publicKeyObject = createPublicKey({
      key: derBuffer,
      format: 'der',
      type: 'spki',
    });

    // 4. Verify ed25519 signature
    const signatureBytes = Buffer.from(signature.value, 'base64');
    return verify(null, Buffer.from(canonical), publicKeyObject, signatureBytes);
  } catch {
    return false;
  }
};
