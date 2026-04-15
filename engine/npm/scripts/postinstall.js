#!/usr/bin/env node
// Downloads the platform-specific Complior binary after npm install
import { createWriteStream, chmodSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BIN_DIR = join(__dirname, "..", "bin");
const REPO = "complior/complior";

function getPackageVersion() {
  const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));
  return `v${pkg.version}`;
}

function getPlatformArtifact() {
  const platform = process.platform;
  const arch = process.arch;

  const map = {
    "linux-x64": "complior-linux-x86_64",
    "linux-arm64": "complior-linux-aarch64",
    "darwin-x64": "complior-macos-x86_64",
    "darwin-arm64": "complior-macos-arm64",
    "win32-x64": "complior-windows-x86_64.exe",
  };

  const key = `${platform}-${arch}`;
  const artifact = map[key];
  if (!artifact) {
    console.error(`Unsupported platform: ${key}`);
    console.error("Supported: linux-x64, linux-arm64, darwin-x64, darwin-arm64, win32-x64");
    process.exit(1);
  }
  return artifact;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { "User-Agent": "complior-npm" } }, (res) => {
      // Follow redirect
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
      }
      const file = createWriteStream(dest);
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", reject);
  });
}

function downloadText(url) {
  return new Promise((resolve, reject) => {
    get(url, { headers: { "User-Agent": "complior-npm" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadText(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => resolve(data.trim()));
    }).on("error", reject);
  });
}

function computeSha256(filePath) {
  const content = readFileSync(filePath);
  return createHash("sha256").update(content).digest("hex");
}

async function main() {
  const artifact = getPlatformArtifact();
  const binaryName = process.platform === "win32" ? "complior.exe" : "complior";
  const binaryPath = join(BIN_DIR, binaryName);

  // Skip if already downloaded
  if (existsSync(binaryPath)) {
    return;
  }

  console.log(`Downloading Complior binary for ${process.platform}-${process.arch}...`);

  try {
    const version = getPackageVersion();
    const url = `https://github.com/${REPO}/releases/download/${version}/${artifact}`;
    const checksumUrl = `${url}.sha256`;

    if (!existsSync(BIN_DIR)) {
      mkdirSync(BIN_DIR, { recursive: true });
    }

    await download(url, binaryPath);

    if (process.platform !== "win32") {
      chmodSync(binaryPath, 0o755);
    }

    // Verify checksum if sidecar file is available
    try {
      const expectedLine = await downloadText(checksumUrl);
      // SHA256 file may contain "hash  filename" or just the hash
      const expectedHash = expectedLine.split(/\s+/)[0].toLowerCase();
      const actualHash = computeSha256(binaryPath);
      if (expectedHash !== actualHash) {
        console.warn(`Warning: SHA256 checksum mismatch for ${artifact}`);
        console.warn(`  Expected: ${expectedHash}`);
        console.warn(`  Actual:   ${actualHash}`);
        console.warn("  The binary may be corrupted. Consider re-downloading.");
      }
    } catch {
      // Checksum file not available — skip verification (pre-release or missing sidecar)
    }

    console.log(`Complior ${version} installed successfully!`);
  } catch (err) {
    console.error("Failed to download Complior binary:", err.message);
    console.error("You can install manually: https://complior.ai/docs/install");
    // Don't fail npm install — binary can be downloaded later
  }
}

main();
