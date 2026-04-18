#!/usr/bin/env bash
set -euo pipefail

echo "=== Verify Cross-Repo Sync Contracts ==="

# Prerequisite: @complior/contracts built
[[ -f engine/contracts/dist/cjs/index.cjs ]] || {
  echo "FAIL: Run 'cd engine/contracts && npm run build' first"
  exit 1
}

# 1. CLI contract tests
echo "1. CLI contract tests..."
cd engine/contracts && npx vitest run --reporter=dot 2>&1 | tail -3
cd ../..
echo "  ✅ Contracts tests GREEN"

# 2. CLI engine tests (re-exports work)
echo "2. Engine sync-contract tests..."
cd engine/core && npx vitest run src/types/sync-contract.test.ts --reporter=dot 2>&1 | tail -3
cd ../..
echo "  ✅ Engine sync-contract GREEN"

# 3. CLI sync-route tests (new tests)
echo "3. Sync route contract tests..."
cd engine/core && npx vitest run src/http/routes/__tests__/sync-route-contracts.test.ts --reporter=dot 2>&1 | tail -3
cd ../..
echo "  ✅ Sync route tests GREEN"

# 4. SaaS integration (if ~/PROJECT exists)
if [[ -d "$HOME/PROJECT" ]]; then
  echo "4. SaaS CJS import test..."
  cd "$HOME/PROJECT"
  node -e "
    const s = require('@complior/contracts/sync');
    const count = Object.keys(s.SyncPassportSchema.shape).length;
    if (count < 30) { console.error('FAIL: Passport has only ' + count + ' fields, expected 36'); process.exit(1); }
    console.log('  Passport fields: ' + count);
    const friaKeys = Object.keys(s.SyncFriaSchema.shape.sections.shape);
    if (friaKeys.length !== 6) { console.error('FAIL: FRIA has ' + friaKeys.length + ' sections, expected 6'); process.exit(1); }
    console.log('  FRIA sections: ' + friaKeys.length);
  " || exit 1
  echo "  ✅ SaaS CJS import works"
  cd "$HOME/complior"
else
  echo "4. SKIP: ~/PROJECT not found (SaaS integration)"
fi

echo ""
echo "=== ALL CHECKS PASSED ==="
