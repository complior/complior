#!/usr/bin/env node
// Launcher for Complior TUI binary installed via npm
import { execFileSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binaryName = process.platform === "win32" ? "complior.exe" : "complior";
const binaryPath = join(__dirname, binaryName);

if (!existsSync(binaryPath)) {
  console.error("Complior binary not found. Run: npm rebuild ai-comply");
  process.exit(1);
}

try {
  execFileSync(binaryPath, process.argv.slice(2), { stdio: "inherit" });
} catch (err) {
  process.exit(err.status ?? 1);
}
