# Complior CLI/TUI — CI/CD, релизы и работа с контрибьюторами

> Актуально: Март 2026 · github.com/complior/complior · AGPLv3

---

## 1. Архитектура репозитория

```
complior/complior/              ← monorepo
├── cli/                        ← Rust binary (complior-cli)
│   ├── src/
│   └── Cargo.toml              version = "X.Y.Z"
├── engine/
│   ├── core/                   ← TypeScript daemon (@complior/engine)
│   │   └── package.json        version: "X.Y.Z"
│   ├── sdk/                    ← TypeScript SDK (@complior/sdk)
│   │   └── package.json        version: "X.Y.Z"
│   └── npm/                    ← npm wrapper (complior)
│       ├── package.json        version: "X.Y.Z"
│       └── scripts/
│           └── postinstall.js  ← скачивает Rust бинарь при install
├── Cargo.toml                  ← workspace
├── .github/
│   └── workflows/
│       ├── ci.yml              ← проверки на каждый PR
│       ├── release.yml         ← публикация при теге v*
│       └── cla.yml             ← CLA проверка для контрибьюторов
├── CLA.md                      ← Contributor License Agreement
├── CHANGELOG.md
├── CONTRIBUTING.md
└── README.md
```

**Версионирование: единая версия везде.** `v1.2.3` в `Cargo.toml`, во всех `package.json` одновременно. Пользователь знает: `complior@1.2.3` = `ai-comply@1.2.3` = GitHub Release `v1.2.3`.

---

## 2. Что публикуется при релизе

```
git tag v1.2.3 → GitHub Actions →

1. GitHub Release
   ├── complior-aarch64-apple-darwin      (macOS Apple Silicon)
   ├── complior-x86_64-apple-darwin       (macOS Intel)
   ├── complior-x86_64-unknown-linux-musl (Linux x64)
   ├── complior-aarch64-unknown-linux-musl (Linux ARM64)
   ├── complior-x86_64-pc-windows-msvc.exe (Windows)
   └── checksums.txt                       (SHA256)

2. crates.io
   └── complior-cli@1.2.3   (для cargo install complior)

3. npm (в правильном порядке!)
   ├── @complior/engine@1.2.3
   ├── @complior/sdk@1.2.3
   └── complior@1.2.3       (ПОСЛЕДНИМ — postinstall качает бинарь)
```

**Порядок критичен:** `ai-comply` при `npm install` запускает `postinstall.js` который скачивает бинарь с GitHub Release. Если опубликовать `ai-comply` до GitHub Release — postinstall упадёт с 404.

---

## 3. Branch strategy для open-source

```
main          ← стабильный. Каждый коммит = tagged release.
               Прямой push запрещён. Только через PR.

dev           ← активная разработка. Сюда идут все PR.
               Защищена: требует CI зелёный + 1 review (от maintainer).

feature/xxx   ← новые фичи (ответвляются от dev)
fix/xxx       ← баг-фиксы (от dev)
hotfix/xxx    ← критичные фиксы (от main, мержатся в main И dev)
docs/xxx      ← только документация
chore/xxx     ← инфраструктура, зависимости
```

### Нужны ли ветки для предыдущих версий?

**Нет, пока не нужны.** Ветки типа `v1.x` или `release/1.2` нужны только когда:
- Ты поддерживаешь несколько major версий одновременно
- Корпоративные клиенты платят за LTS поддержку старых версий

Для open-source CLI инструмента на старте достаточно одной `main`. Если пользователь хочет старую версию — он ставит конкретный тег: `cargo install complior-cli@1.1.0`.

Добавишь `v1.x-maintenance` ветку когда выйдет v2 и кто-то попросит backport фикса.

### Правило flow

```
Разработка:
  feature/xxx → dev → (PR + CI + review) → dev

Релиз:
  dev → (PR "Release v1.2.3") → main → тег v1.2.3 → GitHub Actions

Хотфикс:
  hotfix/xxx → main → тег v1.2.1 → мержится обратно в dev
```

---

## 4. Защита веток (настроить один раз)

### main

```
GitHub → Settings → Branches → Add branch ruleset

Name: protect-main
Target: main

Rules:
✅ Require a pull request before merging
   → Required approvals: 1
✅ Require status checks to pass
   → Add: "CI / All Checks Passed"
✅ Require branches to be up to date before merging
✅ Block force pushes
✅ Restrict deletions
```

### dev

```
GitHub → Settings → Branches → Add branch ruleset

Name: protect-dev
Target: dev

Rules:
✅ Require a pull request before merging
   → Required approvals: 1 (можно 0 для solo работы)
✅ Require status checks to pass
   → Add: "CI / All Checks Passed"
✅ Block force pushes
```

---

## 5. CI — проверки на каждый PR

Файл `.github/workflows/ci.yml`:

**Ключевые особенности:**
- **Path filters** (`dorny/paths-filter`) — Rust-джобы запускаются только при изменениях в `cli/`, `Cargo.toml`, `Cargo.lock`. TS-джобы — только при изменениях в `engine/core/` или `engine/sdk/`. Экономит ~3 минуты на PR без изменений в обоих стеках.
- **Concurrency** — при пуше в ту же ветку предыдущий CI-прогон автоматически отменяется.
- **Version consistency** — проверяет, что версии в Cargo.toml и 3× package.json совпадают.
- **Gate job** — финальный `all-checks` обрабатывает `skipped` результат как OK (для path-filtered джоб).

```yaml
name: CI

on:
  pull_request:
    branches: [main, dev]
  push:
    branches: [dev]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ── Detect changes ──────────────────────────────────
  changes:
    name: Detect changes
    runs-on: ubuntu-latest
    outputs:
      rust: ${{ steps.filter.outputs.rust }}
      ts-engine: ${{ steps.filter.outputs.ts-engine }}
      ts-sdk: ${{ steps.filter.outputs.ts-sdk }}
    steps:
      - uses: actions/checkout@v4
      - uses: dorny/paths-filter@v3
        id: filter
        with:
          filters: |
            rust:
              - 'cli/**'
              - 'Cargo.toml'
              - 'Cargo.lock'
            ts-engine:
              - 'engine/core/**'
            ts-sdk:
              - 'engine/sdk/**'

  # ── Rust ──────────────────────────────────────────
  rust-fmt:
    name: Rust Format
    needs: changes
    if: needs.changes.outputs.rust == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: rustfmt
      - run: cargo fmt --all -- --check

  rust-clippy:
    name: Rust Clippy
    needs: changes
    if: needs.changes.outputs.rust == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
        with:
          components: clippy
      - uses: Swatinem/rust-cache@v2
      - run: cargo clippy --workspace --all-targets -- -D warnings

  rust-test:
    name: Rust Tests
    needs: changes
    if: needs.changes.outputs.rust == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: Swatinem/rust-cache@v2
      - run: cargo test --workspace

  rust-security:
    name: Rust Security Audit
    needs: changes
    if: needs.changes.outputs.rust == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: EmbarkStudios/cargo-deny-action@v2

  # ── TypeScript Engine ────────────────────────────────
  ts-engine-check:
    name: Engine (typecheck + test)
    needs: changes
    if: needs.changes.outputs.ts-engine == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: cd engine/core && npm ci
      - run: cd engine/core && npx tsc --noEmit
      - run: cd engine/core && npx vitest run

  # ── TypeScript SDK ───────────────────────────────────
  ts-sdk-check:
    name: SDK (typecheck + test)
    needs: changes
    if: needs.changes.outputs.ts-sdk == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: cd engine/sdk && npm ci
      - run: cd engine/sdk && npx tsc --noEmit
      - run: cd engine/sdk && npx vitest run

  # ── Security ─────────────────────────────────────────
  npm-audit:
    name: npm Security Audit
    needs: changes
    if: needs.changes.outputs.ts-engine == 'true' || needs.changes.outputs.ts-sdk == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: cd engine/core && npm ci && npm audit --audit-level=critical
      - run: cd engine/sdk && npm ci && npm audit --audit-level=critical

  # ── Version consistency ──────────────────────────────
  version-check:
    name: Version Consistency
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check all versions match
        run: |
          CARGO_VER=$(grep -m1 '^version' Cargo.toml | sed 's/.*"\(.*\)"/\1/')
          ENGINE_VER=$(node -p "require('./engine/core/package.json').version")
          SDK_VER=$(node -p "require('./engine/sdk/package.json').version")
          NPM_VER=$(node -p "require('./engine/npm/package.json').version")

          echo "Cargo.toml:          $CARGO_VER"
          echo "engine/core:         $ENGINE_VER"
          echo "engine/sdk:          $SDK_VER"
          echo "engine/npm:          $NPM_VER"

          MISMATCH=0
          if [ "$CARGO_VER" != "$ENGINE_VER" ]; then echo "❌ Cargo.toml != engine/core"; MISMATCH=1; fi
          if [ "$CARGO_VER" != "$SDK_VER" ]; then echo "❌ Cargo.toml != engine/sdk"; MISMATCH=1; fi
          if [ "$CARGO_VER" != "$NPM_VER" ]; then echo "❌ Cargo.toml != engine/npm"; MISMATCH=1; fi

          if [ "$MISMATCH" -eq 1 ]; then
            echo ""
            echo "All 4 version fields must match. Update them before merging."
            exit 1
          fi
          echo "✅ All versions match: $CARGO_VER"

  # ── Gate ─────────────────────────────────────────────
  all-checks:
    name: All Checks Passed
    runs-on: ubuntu-latest
    if: always()
    needs:
      - changes
      - rust-fmt
      - rust-clippy
      - rust-test
      - rust-security
      - ts-engine-check
      - ts-sdk-check
      - npm-audit
      - version-check
    steps:
      - name: Evaluate results
        run: |
          # Skip check for jobs that were skipped due to path filters
          check_job() {
            local result="$1"
            local name="$2"
            if [ "$result" != "success" ] && [ "$result" != "skipped" ]; then
              echo "❌ $name: $result"
              return 1
            fi
            echo "✅ $name: $result"
            return 0
          }

          FAILED=0
          check_job "${{ needs.rust-fmt.result }}" "rust-fmt" || FAILED=1
          check_job "${{ needs.rust-clippy.result }}" "rust-clippy" || FAILED=1
          check_job "${{ needs.rust-test.result }}" "rust-test" || FAILED=1
          check_job "${{ needs.rust-security.result }}" "rust-security" || FAILED=1
          check_job "${{ needs.ts-engine-check.result }}" "ts-engine-check" || FAILED=1
          check_job "${{ needs.ts-sdk-check.result }}" "ts-sdk-check" || FAILED=1
          check_job "${{ needs.npm-audit.result }}" "npm-audit" || FAILED=1
          check_job "${{ needs.version-check.result }}" "version-check" || FAILED=1

          if [ "$FAILED" -eq 1 ]; then
            echo ""
            echo "One or more checks failed"
            exit 1
          fi
          echo ""
          echo "All checks passed"
```

---

## 6. Release — публикация при теге v*

Файл `.github/workflows/release.yml`:

**Ключевые особенности:**
- **Verify versions** — блокирует релиз, если версии в Cargo.toml / package.json не совпадают с тегом.
- **Cross-compilation** — Linux targets собираются через `cross-rs` (musl static binaries).
- **SDK build** — `@complior/sdk` собирается перед публикацией (создаёт `dist/`).
- **Smoke test** — после публикации проверяет `npm install` и `cargo install` с реестров.
- **Docker** — условный job, запускается только если настроены `DOCKERHUB_*` секреты.
- **Порядок npm** — engine → sdk → complior (последним, postinstall скачивает бинарь с GitHub Release).

```yaml
name: Release

on:
  push:
    tags: ['v*']

permissions:
  contents: write

env:
  CARGO_TERM_COLOR: always

jobs:
  # ── 1. Build binaries for all platforms ──────────────
  build:
    name: Build (${{ matrix.target }})
    runs-on: ${{ matrix.os }}
    strategy:
      fail-fast: false
      matrix:
        include:
          - target: x86_64-unknown-linux-musl
            os: ubuntu-latest
            artifact: complior-linux-x86_64
            cross: true
          - target: aarch64-unknown-linux-musl
            os: ubuntu-latest
            artifact: complior-linux-aarch64
            cross: true
          - target: x86_64-apple-darwin
            os: macos-13
            artifact: complior-macos-x86_64
            cross: false
          - target: aarch64-apple-darwin
            os: macos-14
            artifact: complior-macos-arm64
            cross: false
          - target: x86_64-pc-windows-msvc
            os: windows-latest
            artifact: complior-windows-x86_64.exe
            cross: false

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust toolchain
        uses: dtolnay/rust-toolchain@stable
        with:
          targets: ${{ matrix.target }}

      - uses: Swatinem/rust-cache@v2
        with:
          key: ${{ matrix.target }}

      - name: Install cross-rs
        if: matrix.cross
        run: cargo install cross --git https://github.com/cross-rs/cross

      - name: Build (cross)
        if: matrix.cross
        run: cross build --release --target ${{ matrix.target }} -p complior-cli

      - name: Build (native)
        if: "!matrix.cross"
        run: cargo build --release --target ${{ matrix.target }} -p complior-cli

      - name: Rename binary (Unix)
        if: runner.os != 'Windows'
        run: cp target/${{ matrix.target }}/release/complior ${{ matrix.artifact }}

      - name: Rename binary (Windows)
        if: runner.os == 'Windows'
        run: cp target/${{ matrix.target }}/release/complior.exe ${{ matrix.artifact }}

      - name: Generate checksum (Unix)
        if: runner.os != 'Windows'
        run: sha256sum ${{ matrix.artifact }} > ${{ matrix.artifact }}.sha256

      - name: Generate checksum (Windows)
        if: runner.os == 'Windows'
        run: |
          $hash = (Get-FileHash ${{ matrix.artifact }} -Algorithm SHA256).Hash.ToLower()
          "$hash  ${{ matrix.artifact }}" | Out-File -Encoding ASCII ${{ matrix.artifact }}.sha256

      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: ${{ matrix.artifact }}
          path: |
            ${{ matrix.artifact }}
            ${{ matrix.artifact }}.sha256

  # ── 2. Verify version consistency ────────────────────
  verify-versions:
    name: Verify Versions Match Tag
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check versions match tag
        run: |
          TAG_VER="${GITHUB_REF_NAME#v}"
          CARGO_VER=$(grep -m1 '^version' Cargo.toml | sed 's/.*"\(.*\)"/\1/')
          ENGINE_VER=$(node -p "require('./engine/core/package.json').version")
          SDK_VER=$(node -p "require('./engine/sdk/package.json').version")
          NPM_VER=$(node -p "require('./engine/npm/package.json').version")

          echo "Tag:          $TAG_VER"
          echo "Cargo.toml:   $CARGO_VER"
          echo "engine/core:  $ENGINE_VER"
          echo "engine/sdk:   $SDK_VER"
          echo "engine/npm:   $NPM_VER"

          FAIL=0
          if [ "$CARGO_VER" != "$TAG_VER" ]; then echo "❌ Cargo.toml version mismatch"; FAIL=1; fi
          if [ "$ENGINE_VER" != "$TAG_VER" ]; then echo "❌ engine/core version mismatch"; FAIL=1; fi
          if [ "$SDK_VER" != "$TAG_VER" ]; then echo "❌ engine/sdk version mismatch"; FAIL=1; fi
          if [ "$NPM_VER" != "$TAG_VER" ]; then echo "❌ engine/npm version mismatch"; FAIL=1; fi

          if [ "$FAIL" -eq 1 ]; then
            echo ""
            echo "Version in source files must match git tag. Aborting release."
            exit 1
          fi
          echo "✅ All versions match tag: $TAG_VER"

  # ── 3. GitHub Release ────────────────────────────────
  release:
    name: Create GitHub Release
    needs: [build, verify-versions]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Download all artifacts
        uses: actions/download-artifact@v4
        with:
          path: artifacts
          merge-multiple: true

      - name: Merge checksums
        run: cat artifacts/*.sha256 > artifacts/checksums.txt

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
          files: |
            artifacts/complior-linux-x86_64
            artifacts/complior-linux-aarch64
            artifacts/complior-macos-arm64
            artifacts/complior-macos-x86_64
            artifacts/complior-windows-x86_64.exe
            artifacts/checksums.txt
          prerelease: ${{ contains(github.ref_name, '-alpha') || contains(github.ref_name, '-beta') || contains(github.ref_name, '-rc') }}

  # ── 4. Publish to crates.io ──────────────────────────
  cargo-publish:
    name: Publish to crates.io
    needs: release
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - name: Publish complior-cli
        run: cargo publish -p complior-cli
        env:
          CARGO_REGISTRY_TOKEN: ${{ secrets.CARGO_TOKEN }}

  # ── 5. Publish npm packages ──────────────────────────
  npm-publish:
    name: Publish npm packages
    needs: release    # ПОСЛЕ GitHub Release (postinstall downloads binary)
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'

      # Build SDK before publishing (produces dist/)
      - name: Build @complior/sdk
        run: cd engine/sdk && npm ci && npm run build

      - name: Publish @complior/engine
        run: cd engine/core && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish @complior/sdk
        run: cd engine/sdk && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish complior (ПОСЛЕДНИМ — postinstall скачивает бинарь)
        run: cd engine/npm && npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  # ── 6. Smoke test ────────────────────────────────────
  smoke-test:
    name: Smoke Test
    needs: [cargo-publish, npm-publish]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> "$GITHUB_OUTPUT"

      - name: Test npm install
        run: |
          npm install @complior/sdk@${{ steps.version.outputs.version }}
          node -e "const { complior } = require('@complior/sdk'); console.log('✅ @complior/sdk loaded')"

      - name: Test cargo install
        run: |
          curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
          source "$HOME/.cargo/env"
          cargo install complior-cli --version ${{ steps.version.outputs.version }}
          complior --version
          echo "✅ complior-cli installed and runs"

  # ── 7. Docker (optional — only if secrets exist) ─────
  docker:
    name: Docker image
    needs: release
    runs-on: ubuntu-latest
    if: ${{ secrets.DOCKERHUB_USERNAME != '' }}
    steps:
      - uses: actions/checkout@v4

      - name: Download Linux x86_64 binary
        uses: actions/download-artifact@v4
        with:
          name: complior-linux-x86_64
          path: docker-build

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> "$GITHUB_OUTPUT"

      - name: Build and push
        uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: |
            complior/complior:${{ steps.version.outputs.version }}
            complior/complior:latest
```

---

## 7. Secrets для GitHub Actions

```
github.com/complior/complior → Settings → Secrets → Actions
```

| Secret | Как получить |
|--------|-------------|
| `CARGO_TOKEN` | crates.io → Account Settings → API Tokens → New Token |
| `NPM_TOKEN` | npmjs.com → Access Tokens → Generate New Token → Automation |
| `CLA_TOKEN` | GitHub → Settings → Developer settings → Personal access tokens → Generate (scopes: `repo`, `workflow`) |
| `DOCKERHUB_USERNAME` | (Опционально) Docker Hub username — Docker job запустится только если настроен |
| `DOCKERHUB_TOKEN` | (Опционально) Docker Hub → Account Settings → Security → Access Tokens |

### CODEOWNERS

Файл `.github/CODEOWNERS` — автоматически назначает ревьюеров на PR:

```
*                       @a3ka        # Default: maintainer reviews everything
/cli/                   @a3ka        # Rust CLI
/engine/core/           @a3ka        # TypeScript Engine
/engine/sdk/            @a3ka        # TypeScript SDK
/.github/               @a3ka        # CI/CD — extra caution
/LICENSE                @a3ka        # License & legal
/CLA.md                 @a3ka        # CLA
```

---

## 8. Как делать релиз (пошагово)

### Обычный релиз

```bash
# 1. Убедись что dev стабильный
git checkout dev
git pull origin dev

# 2. Создай Release PR: dev → main
# GitHub → Pull requests → New pull request
# base: main, compare: dev
# Title: "Release v1.2.3"

# 3. В PR обнови версии во всех файлах:
# cli/Cargo.toml:       version = "1.2.3"
# engine/core/package.json:  "version": "1.2.3"
# engine/sdk/package.json:   "version": "1.2.3"
# engine/npm/package.json:   "version": "1.2.3"

# 4. Обнови CHANGELOG.md (см. формат ниже)

# 5. CI зелёный → merge PR в main

# 6. Создай тег — это триггер для release.yml:
git checkout main
git pull origin main
git tag -a v1.2.3 -m "Release v1.2.3"
git push origin v1.2.3

# 7. GitHub Actions автоматически:
#    ├── собирает бинари для 5 платформ
#    ├── создаёт GitHub Release с бинарями и checksums
#    ├── публикует на crates.io
#    └── публикует npm пакеты (engine → sdk → ai-comply)

# 8. Замержи main обратно в dev:
git checkout dev
git merge main
git push origin dev
```

### Pre-release (alpha/beta/rc)

```bash
# Тег с суффиксом → GitHub Release помечается как prerelease
git tag -a v1.2.0-beta.1 -m "Beta release"
git push origin v1.2.0-beta.1
```

Пользователи получат его только при `npm install complior@beta` или `cargo install complior-cli --version 1.2.0-beta.1`.

### Hotfix

```bash
# 1. Ветка от main (не dev!)
git checkout main
git checkout -b hotfix/fix-critical-crash

# 2. Правишь, коммитишь
git commit -m "fix: prevent crash on empty project"

# 3. PR: hotfix/xxx → main
# После merge:
git tag -a v1.2.1 -m "Hotfix: prevent crash on empty project"
git push origin v1.2.1

# 4. Замержи hotfix в dev тоже:
git checkout dev
git merge hotfix/fix-critical-crash
git push origin dev
git branch -d hotfix/fix-critical-crash
```

---

## 9. CHANGELOG.md — формат

```markdown
# Changelog

All notable changes to this project will be documented in this file.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

## [Unreleased]

## [1.2.3] - 2026-04-01

### Added
- MCP Guard Tools: 3 new runtime protection tools (#145)
- `complior eval --ci` flag for CI/CD integration (#142)

### Fixed
- CLI crash on empty project directory (#140)
- Engine memory leak in file watcher (#138)

### Changed
- Scanner L4 now uses parallel processing, 3x faster (#135)

### Breaking Changes
- None

## [1.2.2] - 2026-03-15

### Fixed
- ...

[Unreleased]: https://github.com/complior/complior/compare/v1.2.3...HEAD
[1.2.3]: https://github.com/complior/complior/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/complior/complior/compare/v1.2.1...v1.2.2
```

---

## 10. Работа с контрибьюторами

### CONTRIBUTING.md (создать в корне репо)

```markdown
# Contributing to Complior

Thank you for your interest in contributing!

## Before you start

- Check existing [issues](https://github.com/complior/complior/issues)
- For large changes, open an issue first to discuss

## Development setup

\```bash
# Clone
git clone https://github.com/complior/complior.git
cd complior

# Rust (CLI)
cargo build
cargo test

# TypeScript (Engine)
cd engine/core && npm install && npm test
cd engine/sdk  && npm install && npm test
\```

## Branch naming

\```
feature/short-description
fix/issue-number-short-description
docs/what-changed
chore/what-changed
\```

## Commit format (Conventional Commits)

\```
feat(cli): add --diff flag for compliance comparison
fix(engine): resolve memory leak in file watcher
docs: update installation guide
chore(ci): add cargo audit step
\```

## Pull Request process

1. Fork the repo
2. Create branch from `dev` (not `main`)
3. Write tests for new functionality
4. Ensure CI passes: `cargo test && cargo clippy && cargo fmt`
5. Open PR against `dev` branch
6. Maintainer reviews within 48 hours

## What we accept

✅ Bug fixes with reproduction case
✅ New features discussed in an issue first
✅ Documentation improvements
✅ Performance improvements with benchmarks
✅ New platform support

## What we don't accept

❌ Breaking changes without prior discussion
❌ PRs against `main` directly
❌ Code without tests
```

### PR Template (`.github/pull_request_template.md`)

```markdown
## Description
<!-- What does this PR do? Why? -->

## Type of Change
- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change
- [ ] Documentation
- [ ] Refactoring
- [ ] CI/CD

## Testing
<!-- How did you test this? -->
\```bash
cargo test
# или
cd engine/core && npm test
\```

## Checklist
- [ ] `cargo fmt` passes
- [ ] `cargo clippy` no warnings
- [ ] `cargo test` passes
- [ ] Tests added for new functionality
- [ ] CHANGELOG.md updated (for features/fixes)
- [ ] Documentation updated if needed

## Related Issues
Closes #
```

---

## 11. CLA — Contributor License Agreement

### Зачем

AGPLv3 защищает от конкурентов (SaaS на твоём коде → обязан раскрыть код). Но если контрибьютор добавил код в engine, а ты хочешь использовать engine в закрытом SaaS — AGPL запрещает. CLA решает это: контрибьютор передаёт тебе право релицензировать его код.

### Как работает

1. Новый контрибьютор открывает PR
2. CLA Assistant бот комментирует: "Подпишите CLA"
3. Контрибьютор пишет: `I have read the CLA Document and I hereby sign the CLA`
4. Бот ставит зелёный check, подпись сохраняется в `signatures/cla.json`
5. Все будущие PR от этого контрибьютора проходят автоматически

### Файлы

| Файл | Назначение |
|------|-----------|
| `CLA.md` | Юридический текст соглашения (в корне репо) |
| `.github/workflows/cla.yml` | GitHub Action — бот для автоподписи |
| `signatures/cla.json` | Реестр подписей (автогенерируется ботом) |

### GitHub Action (`.github/workflows/cla.yml`)

```yaml
name: CLA Assistant

on:
  issue_comment:
    types: [created]
  pull_request_target:
    types: [opened, closed, synchronize]

permissions:
  actions: write
  contents: write
  pull-requests: write
  statuses: write

jobs:
  cla-check:
    if: |
      (github.event_name == 'pull_request_target' && github.event.action != 'closed') ||
      (github.event_name == 'issue_comment' && github.event.issue.pull_request &&
       startsWith(github.event.comment.body, 'I have read the CLA'))
    runs-on: ubuntu-latest
    steps:
      - name: CLA Assistant
        uses: contributor-assistant/github-action@v2.6.1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          PERSONAL_ACCESS_TOKEN: ${{ secrets.CLA_TOKEN }}
        with:
          path-to-signatures: 'signatures/cla.json'
          path-to-document: 'https://github.com/complior/complior/blob/main/CLA.md'
          branch: 'main'
          allowlist: 'bot*,dependabot*,renovate*'
```

### Настройка (один раз)

```
1. GitHub → Settings → Secrets → Actions → New secret
   Name: CLA_TOKEN
   Value: Personal Access Token с правами repo + workflow

2. CLA.md уже в корне репо

3. .github/workflows/cla.yml уже создан

4. При первом запуске бот создаст signatures/cla.json автоматически
```

### Что даёт CLA владельцу проекта

- **Релицензирование**: можешь использовать код контрибьюторов в проприетарном SaaS
- **Enterprise лицензии**: можешь продавать engine под не-AGPL лицензией корпорациям
- **Юридическая чистота**: каждый контрибьютор подтверждает авторство и права
- **Патентная защита**: контрибьютор лицензирует свои патенты проекту

---

## 12. Issue Templates (`.github/ISSUE_TEMPLATE/`)

### bug_report.yml

```yaml
name: Bug Report
description: Something is not working
labels: ["bug", "needs-triage"]
body:
  - type: markdown
    attributes:
      value: "Thanks for taking the time to report a bug!"

  - type: textarea
    id: description
    attributes:
      label: Bug Description
      description: What happened?
    validations:
      required: true

  - type: textarea
    id: reproduce
    attributes:
      label: Steps to Reproduce
      value: |
        1. Run `complior ...`
        2. ...
    validations:
      required: true

  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
    validations:
      required: true

  - type: input
    id: version
    attributes:
      label: Complior Version
      placeholder: "complior --version"
    validations:
      required: true

  - type: dropdown
    id: os
    attributes:
      label: Operating System
      options:
        - macOS (Apple Silicon)
        - macOS (Intel)
        - Linux (x64)
        - Linux (ARM64)
        - Windows
    validations:
      required: true

  - type: textarea
    id: logs
    attributes:
      label: Logs
      description: "Run with `--debug` flag: `complior scan --debug 2>&1 | head -50`"
      render: shell
```

### feature_request.yml

```yaml
name: Feature Request
description: Suggest a new feature
labels: ["feature", "needs-triage"]
body:
  - type: textarea
    id: problem
    attributes:
      label: Problem / Motivation
      description: "What problem does this solve? Example: As a developer, I need X because Y"
    validations:
      required: true

  - type: textarea
    id: solution
    attributes:
      label: Proposed Solution
    validations:
      required: true

  - type: textarea
    id: alternatives
    attributes:
      label: Alternatives Considered
```

---

## 13. Renovate Bot — автообновление зависимостей

Создай `renovate.json` в корне репо:

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base"],
  "baseBranches": ["dev"],
  "prCreation": "not-pending",
  "automerge": false,
  "labels": ["dependencies"],
  "packageRules": [
    {
      "matchManagers": ["cargo"],
      "groupName": "Rust dependencies"
    },
    {
      "matchManagers": ["npm"],
      "groupName": "npm dependencies"
    },
    {
      "matchDepTypes": ["devDependencies"],
      "automerge": true
    }
  ]
}
```

Установка:
```
github.com/apps/renovate → Install → complior/complior
```

Renovate будет открывать PR в `dev` ветку каждую неделю с обновлениями зависимостей.

---

## 14. Чеклист первого релиза

### Один раз (настройка)
```
[ ] GitHub Secrets добавлены: CARGO_TOKEN, NPM_TOKEN, CLA_TOKEN
[ ] Ветки main и dev созданы и защищены
[ ] .github/workflows/ci.yml добавлен
[ ] .github/workflows/release.yml добавлен
[ ] .github/workflows/cla.yml добавлен
[ ] CLA.md в корне репо
[ ] CONTRIBUTING.md создан (с упоминанием CLA)
[ ] .github/pull_request_template.md создан
[ ] .github/CODEOWNERS создан
[ ] .github/ISSUE_TEMPLATE/ создан
[ ] renovate.json создан + Renovate Bot установлен
[ ] crates.io: пакет complior-cli зарегистрирован (reserved)
[ ] npmjs.com: пакеты @complior/engine, @complior/sdk, complior зарегистрированы
[ ] LICENSE файл = AGPL-3.0 (не Apache-2.0!)
```

### Каждый релиз
```
[ ] Все тесты зелёные на dev
[ ] CHANGELOG.md обновлён
[ ] Версия обновлена во всех 4 файлах (Cargo.toml + 3× package.json)
[ ] PR "Release vX.Y.Z": dev → main создан и замержен
[ ] git tag -a vX.Y.Z → git push origin vX.Y.Z
[ ] GitHub Actions: все jobs зелёные
[ ] GitHub Release создан с бинарями
[ ] crates.io: complior-cli@X.Y.Z появился
[ ] npmjs.com: все три пакета@X.Y.Z появились (engine, sdk, complior)
[ ] main замержен обратно в dev
[ ] Announce: Twitter/X, Reddit r/opensource, Discord
```
