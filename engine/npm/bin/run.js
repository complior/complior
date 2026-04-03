#!/usr/bin/env node
// Launcher for Complior CLI binary installed via npm
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binaryName = process.platform === "win32" ? "complior.exe" : "complior";
const binaryPath = join(__dirname, binaryName);

if (!existsSync(binaryPath)) {
  console.error("Complior binary not found. Run: npm rebuild complior");
  process.exit(1);
}

// Resolve @complior/engine location so the Rust binary can find & start it
const require = createRequire(import.meta.url);
let engineDir;
try {
  const enginePkg = require.resolve("@complior/engine/package.json");
  engineDir = dirname(enginePkg);
} catch {
  // Engine not found — binary will show its own error
}

const env = { ...process.env };
if (engineDir) {
  env.COMPLIOR_ENGINE_DIR = engineDir;
}

try {
  execFileSync(binaryPath, process.argv.slice(2), { stdio: "inherit", env });
} catch (err) {
  process.exit(err.status ?? 1);
}
