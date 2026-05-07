#!/usr/bin/env bash
# Bump version in package.json, src-tauri/tauri.conf.json, and
# src-tauri/Cargo.toml, then commit, tag, and push.
#
# Usage:
#   scripts/release.sh 0.1.1
#
# Optional flags:
#   --no-push    create the tag locally but don't push (lets you inspect)
#   --dry-run    print what would happen without changing anything

set -euo pipefail

NO_PUSH=0
DRY_RUN=0
NEW_VERSION=""

for arg in "$@"; do
  case "$arg" in
    --no-push) NO_PUSH=1 ;;
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      if [[ -z "$NEW_VERSION" ]]; then
        NEW_VERSION="$arg"
      else
        echo "error: unexpected argument: $arg" >&2
        exit 1
      fi
      ;;
  esac
done

if [[ -z "$NEW_VERSION" ]]; then
  echo "error: missing version. usage: scripts/release.sh <version> [--no-push] [--dry-run]" >&2
  exit 1
fi

if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?$ ]]; then
  echo "error: version must be semver (e.g. 0.1.1 or 0.2.0-beta.1), got: $NEW_VERSION" >&2
  exit 1
fi

# Run from repo root regardless of where the script is invoked.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PKG="package.json"
CONF="src-tauri/tauri.conf.json"
CARGO="src-tauri/Cargo.toml"

for f in "$PKG" "$CONF" "$CARGO"; do
  [[ -f "$f" ]] || { echo "error: missing $f" >&2; exit 1; }
done

# Refuse to release with a dirty tree.
if [[ -n "$(git status --porcelain)" ]]; then
  echo "error: working tree is dirty. commit or stash first." >&2
  git status --short
  exit 1
fi

CURRENT_VERSION="$(node -p "require('./$PKG').version")"

if [[ "$CURRENT_VERSION" == "$NEW_VERSION" ]]; then
  echo "error: version is already $NEW_VERSION in $PKG" >&2
  exit 1
fi

TAG="v$NEW_VERSION"
if git rev-parse --verify --quiet "refs/tags/$TAG" >/dev/null; then
  echo "error: tag $TAG already exists locally" >&2
  exit 1
fi

if git ls-remote --exit-code --tags origin "$TAG" >/dev/null 2>&1; then
  echo "error: tag $TAG already exists on origin" >&2
  exit 1
fi

echo "Bumping $CURRENT_VERSION -> $NEW_VERSION"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "[dry-run] would update $PKG, $CONF, $CARGO"
  echo "[dry-run] would commit + tag $TAG"
  [[ "$NO_PUSH" -eq 0 ]] && echo "[dry-run] would push origin main + $TAG"
  exit 0
fi

# package.json — only the top-level "version" key.
node -e "
  const fs = require('fs');
  const p = require('./$PKG');
  p.version = '$NEW_VERSION';
  fs.writeFileSync('$PKG', JSON.stringify(p, null, 2) + '\n');
"

# tauri.conf.json — only the top-level "version" key.
node -e "
  const fs = require('fs');
  const c = require('./$CONF');
  c.version = '$NEW_VERSION';
  fs.writeFileSync('$CONF', JSON.stringify(c, null, 2) + '\n');
"

# Cargo.toml — only the [package] version, leave dependency versions alone.
# Match the first 'version = "..."' line that follows '[package]'.
python3 - <<PY
import re, pathlib
p = pathlib.Path("$CARGO")
text = p.read_text()
def repl(m):
    return m.group(1) + '"$NEW_VERSION"'
new = re.sub(
    r'(\[package\][^\[]*?version\s*=\s*)"[^"]+"',
    repl,
    text,
    count=1,
    flags=re.DOTALL,
)
if new == text:
    raise SystemExit("error: failed to update version in $CARGO")
p.write_text(new)
PY

# Refresh Cargo.lock so it's in sync (otherwise CI may complain).
( cd src-tauri && cargo update -p vaulty --precise "$NEW_VERSION" >/dev/null 2>&1 ) || true

git add "$PKG" "$CONF" "$CARGO" src-tauri/Cargo.lock 2>/dev/null || git add "$PKG" "$CONF" "$CARGO"
git commit -m "release: $TAG"
git tag -a "$TAG" -m "$TAG"

if [[ "$NO_PUSH" -eq 1 ]]; then
  echo "Local tag $TAG created. Push with:"
  echo "  git push origin main && git push origin $TAG"
  exit 0
fi

git push origin HEAD
git push origin "$TAG"

echo
echo "Released $TAG."
echo "Watch the build: https://github.com/awade12/vaulty/actions"
echo "When publish completes: https://github.com/awade12/vaulty/releases/latest"
