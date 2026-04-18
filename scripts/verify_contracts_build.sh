#!/usr/bin/env bash
set -euo pipefail

echo "=== Verify @complior/contracts Build ==="

cd engine/contracts

# 1. Build produces dist/
echo "1. Building..."
npm run build
[[ -f dist/cjs/index.cjs ]] || { echo "FAIL: dist/cjs/index.cjs missing"; exit 1; }
[[ -f dist/cjs/sync/index.cjs ]] || { echo "FAIL: dist/cjs/sync/index.cjs missing"; exit 1; }
[[ -f dist/cjs/shared/index.cjs ]] || { echo "FAIL: dist/cjs/shared/index.cjs missing"; exit 1; }
[[ -f dist/esm/index.js ]] || { echo "FAIL: dist/esm/index.js missing"; exit 1; }
[[ -f dist/esm/index.d.ts ]] || { echo "FAIL: dist/esm/index.d.ts missing"; exit 1; }
echo "  ✅ Build artifacts exist"

# 2. CJS require works
echo "2. CJS require..."
COUNT=$(node -e "const c = require('./dist/cjs/index.cjs'); console.log(Object.keys(c).length)")
[[ "$COUNT" -gt 0 ]] || { echo "FAIL: CJS exports nothing"; exit 1; }
echo "  ✅ CJS exports $COUNT symbols"

# 3. CJS sync schemas are Zod schemas
echo "3. Sync schemas check..."
node -e "
  const s = require('./dist/cjs/sync/index.cjs');
  const schemas = ['SyncPassportSchema','SyncScanSchema','SyncDocumentsSchema','SyncFriaSchema'];
  for (const name of schemas) {
    if (!s[name] || typeof s[name].safeParse !== 'function') {
      console.error('FAIL: ' + name + ' not a Zod schema');
      process.exit(1);
    }
  }
  console.log('  All 4 sync schemas have .safeParse()');
" || exit 1
echo "  ✅ Sync schemas valid"

# 4. Fixtures validate via CJS
echo "4. Fixtures validation via CJS..."
node -e "
  const s = require('./dist/cjs/sync/index.cjs');
  const fs = require('fs');
  const path = require('path');
  const fixtures = [
    ['sync-passport-full.json', 'SyncPassportSchema'],
    ['sync-passport-minimal.json', 'SyncPassportSchema'],
    ['sync-scan-valid.json', 'SyncScanSchema'],
    ['sync-documents-valid.json', 'SyncDocumentsSchema'],
    ['sync-fria-valid.json', 'SyncFriaSchema'],
  ];
  for (const [file, schema] of fixtures) {
    const data = JSON.parse(fs.readFileSync(path.join('fixtures', file), 'utf-8'));
    const result = s[schema].safeParse(data);
    if (!result.success) {
      console.error('FAIL: ' + file + ' → ' + JSON.stringify(result.error.flatten()));
      process.exit(1);
    }
  }
  console.log('  All 5 fixtures validate');
" || exit 1
echo "  ✅ Fixtures pass CJS validation"

# 5. Contract tests pass
echo "5. Contract tests..."
npx vitest run --reporter=verbose 2>&1 | tail -5
echo "  ✅ Tests green"

echo ""
echo "=== ALL CHECKS PASSED ==="
