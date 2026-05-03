#!/usr/bin/env bash
set -euo pipefail

echo "=== C-M03: Verify CLI Pre-Send Validation ==="
echo ""

ROUTE_FILE="engine/core/src/http/routes/sync.route.ts"
FAIL=0

# 1. sync.route.ts imports all 4 schemas
echo "1. Import check..."
for schema in SyncPassportSchema SyncScanSchema SyncDocumentsSchema SyncFriaSchema; do
  if ! grep -q "$schema" "$ROUTE_FILE"; then
    echo "  FAIL: $schema not imported in sync.route.ts"
    FAIL=1
  fi
done
if [[ "$FAIL" -eq 0 ]]; then
  echo "  OK: All 4 schemas imported"
fi

# 2. Each endpoint uses safeParse before sending
echo "2. safeParse usage..."
for schema in SyncPassportSchema SyncScanSchema SyncDocumentsSchema SyncFriaSchema; do
  COUNT=$(grep -c "${schema}.safeParse" "$ROUTE_FILE" || true)
  if [[ "$COUNT" -lt 1 ]]; then
    echo "  FAIL: ${schema}.safeParse not found in sync.route.ts"
    FAIL=1
  fi
done
if [[ "$FAIL" -eq 0 ]]; then
  echo "  OK: All 4 endpoints use safeParse"
fi

# 3. Contract tests pass
echo "3. Contract tests..."
cd engine/core
TEST_OUTPUT=$(npx vitest run src/http/routes/__tests__/sync-route-contracts.test.ts --reporter=dot 2>&1) || {
  echo "  FAIL: Contract tests failed"
  echo "$TEST_OUTPUT" | tail -10
  FAIL=1
}
if [[ "$FAIL" -eq 0 ]]; then
  echo "  OK: Tests GREEN"
fi
cd ../..

echo ""
if [[ "$FAIL" -ne 0 ]]; then
  echo "=== CHECKS FAILED ==="
  exit 1
fi

echo "=== ALL CHECKS PASSED ==="
