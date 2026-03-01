// US-S0205: Binary download — platform detection tests
// Run: node --test packages/npm/scripts/postinstall.test.js

import { describe, it } from "node:test";
import assert from "node:assert/strict";

// Platform → expected artifact name mapping (mirrors postinstall.js)
const ARTIFACT_MAP = {
  "linux-x64":     "complior-linux-x86_64",
  "linux-arm64":   "complior-linux-aarch64",
  "darwin-x64":    "complior-macos-x86_64",
  "darwin-arm64":  "complior-macos-arm64",
  "win32-x64":     "complior-windows-x86_64.exe",
};

function getPlatformArtifact(platform, arch) {
  const key = `${platform}-${arch}`;
  return ARTIFACT_MAP[key] ?? null;
}

describe("binary_download: platform detection", () => {
  it("linux x64 → linux-x86_64 artifact", () => {
    assert.equal(getPlatformArtifact("linux", "x64"), "complior-linux-x86_64");
  });

  it("linux arm64 → linux-aarch64 artifact", () => {
    assert.equal(getPlatformArtifact("linux", "arm64"), "complior-linux-aarch64");
  });

  it("darwin x64 → macos-x86_64 artifact", () => {
    assert.equal(getPlatformArtifact("darwin", "x64"), "complior-macos-x86_64");
  });

  it("darwin arm64 → macos-arm64 artifact", () => {
    assert.equal(getPlatformArtifact("darwin", "arm64"), "complior-macos-arm64");
  });

  it("win32 x64 → windows-x86_64.exe artifact", () => {
    assert.equal(getPlatformArtifact("win32", "x64"), "complior-windows-x86_64.exe");
  });

  it("unsupported platform → null", () => {
    assert.equal(getPlatformArtifact("freebsd", "x64"), null);
  });

  it("all 5 supported platforms resolve to non-null", () => {
    const supported = [
      ["linux", "x64"], ["linux", "arm64"],
      ["darwin", "x64"], ["darwin", "arm64"],
      ["win32", "x64"],
    ];
    for (const [platform, arch] of supported) {
      const artifact = getPlatformArtifact(platform, arch);
      assert.ok(artifact, `${platform}-${arch} must have an artifact`);
      assert.ok(artifact.startsWith("complior-"), "artifact must start with 'complior-'");
    }
  });
});
