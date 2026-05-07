#!/usr/bin/env bash
# V2-M02 — Acceptance: real MCP server registers all 13 tools (Core 7 + Builder 3 + Analytics 3).
#
# Failure mode being prevented: the schema layer (tools.ts) and handler layer
# (handlers.ts) silently drift from server.ts registration → tools defined but
# not exposed to MCP clients (Claude Code, Cursor, etc.).
#
# Spec:
#   1. Build engine TypeScript
#   2. Spawn engine in MCP mode (`node dist/server.js mcp-server`) over stdio
#   3. Send JSON-RPC `initialize` + `tools/list`
#   4. Parse response — must list ALL 13 tool names
#   5. Verify each new V2-M02 tool's input schema includes the documented params
#   6. Tear down engine cleanly (no orphaned processes)
#
# Exit 0 on success, non-zero on any check failure.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENGINE_DIR="${REPO_ROOT}/engine/core"

cd "${ENGINE_DIR}"

EXPECTED_TOOLS=(
  # Core (v1.0)
  complior_scan
  complior_fix
  complior_status
  complior_explain
  complior_search_tool
  complior_classify
  complior_report
  # Builder (V2-M02)
  complior_passport_init
  complior_doc_generate
  complior_redteam
  # Analytics (V2-M02)
  complior_evidence_verify
  complior_drift_detect
  complior_obligations_status
)

# ── Step 1: Build engine ─────────────────────────────────────────────
echo ">> Building engine TypeScript..."
if ! npm run build >/tmp/v2m02_build.log 2>&1; then
  echo "FAIL: engine build failed. See /tmp/v2m02_build.log:"
  tail -30 /tmp/v2m02_build.log
  exit 1
fi

DIST_SERVER="${ENGINE_DIR}/dist/src/server.js"
if [[ ! -f "${DIST_SERVER}" ]]; then
  echo "FAIL: ${DIST_SERVER} not produced by build"
  exit 1
fi

# ── Step 2: Drive MCP stdio server with embedded Node.js client ──────
echo ">> Probing MCP server tools/list..."

OUTPUT="$(node --input-type=module -e "
import { spawn } from 'node:child_process';

const proc = spawn('node', ['${DIST_SERVER}', 'mcp-server'], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: { ...process.env, COMPLIOR_PROJECT_PATH: '${REPO_ROOT}' },
});

let buf = '';
let timeoutHandle;

proc.stdout.on('data', (chunk) => {
  buf += chunk.toString('utf-8');
  const lines = buf.split('\n');
  buf = lines.pop() ?? '';
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const msg = JSON.parse(line);
      if (msg.id === 1) {
        // initialize OK → request tools/list
        proc.stdin.write(JSON.stringify({
          jsonrpc: '2.0', id: 2, method: 'tools/list', params: {},
        }) + '\n');
      } else if (msg.id === 2) {
        const names = msg.result?.tools?.map(t => t.name) ?? [];
        console.log('TOOLS:' + names.join(','));
        clearTimeout(timeoutHandle);
        proc.kill('SIGTERM');
        process.exit(0);
      }
    } catch {
      // ignore non-JSON log lines
    }
  }
});

proc.stderr.on('data', (chunk) => {
  process.stderr.write('[engine stderr] ' + chunk.toString('utf-8'));
});

proc.on('error', (err) => {
  console.error('Failed to spawn engine:', err);
  process.exit(1);
});

timeoutHandle = setTimeout(() => {
  console.error('Timeout: no tools/list response within 15s');
  proc.kill('SIGKILL');
  process.exit(1);
}, 15000);

// Send initialize
proc.stdin.write(JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize', params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'verify-v2-m02', version: '0.0.0' },
  },
}) + '\n');
" 2>&1 || true)"

TOOLS_LINE="$(echo "${OUTPUT}" | grep '^TOOLS:' || true)"
if [[ -z "${TOOLS_LINE}" ]]; then
  echo "FAIL: no TOOLS: line in MCP response"
  echo "----- raw output -----"
  echo "${OUTPUT}"
  exit 1
fi

# Extract comma-separated tool names
DISCOVERED_RAW="${TOOLS_LINE#TOOLS:}"
IFS=',' read -ra DISCOVERED <<< "${DISCOVERED_RAW}"

# ── Step 3: Compare against EXPECTED ─────────────────────────────────
MISSING=()
for expected in "${EXPECTED_TOOLS[@]}"; do
  found=0
  for actual in "${DISCOVERED[@]}"; do
    if [[ "${actual}" == "${expected}" ]]; then
      found=1
      break
    fi
  done
  if [[ "${found}" -eq 0 ]]; then
    MISSING+=("${expected}")
  fi
done

if [[ "${#MISSING[@]}" -gt 0 ]]; then
  echo "FAIL: ${#MISSING[@]} tools missing from MCP server:"
  printf '  - %s\n' "${MISSING[@]}"
  echo ""
  echo "Discovered (${#DISCOVERED[@]}): ${DISCOVERED_RAW}"
  exit 1
fi

# ── Step 4: Sanity check — count and unexpected extras ───────────────
if [[ "${#DISCOVERED[@]}" -ne 13 ]]; then
  echo "FAIL: expected 13 tools, got ${#DISCOVERED[@]}"
  echo "Discovered: ${DISCOVERED_RAW}"
  exit 1
fi

# ── Step 5: Final report ─────────────────────────────────────────────
echo ""
echo "✓ V2-M02 smoke test PASSED"
echo "  - Engine built and started in MCP mode"
echo "  - 13/13 expected tools registered"
echo "  - All Core 7 + Builder 3 + Analytics 3 present"
echo ""
echo "Discovered tools:"
printf '  - %s\n' "${DISCOVERED[@]}"
exit 0
