# Release checklist

Just do these four things.

## 1. Bump the version

Pick a new semver version (e.g. `0.1.1`). Either run the script:

```bash
./scripts/release.sh 0.1.1
```

…or edit by hand in three files (must match exactly):

- `package.json` → `"version"`
- `src-tauri/tauri.conf.json` → `"version"`
- `src-tauri/Cargo.toml` → `[package].version`

## 2. Commit the bump

```bash
git add -A
git commit -m "release: v0.1.1"
git push origin main
```

(The script does this for you.)

## 3. Tag and push

```bash
git tag v0.1.1
git push origin v0.1.1
```

(The script does this for you too.)

## 4. Watch Actions

Open `https://github.com/awade12/vaulty/actions`. Four parallel build
jobs run, then a `Publish release` job flips the draft to **Latest**.

When that's green, you're shipped:

- Install URL: <https://github.com/awade12/vaulty/releases/latest>
- Existing installs auto-update via Settings → Updates.

---

## If something goes wrong

- One platform fails → release stays as a draft. Fix the issue, delete
  the tag (`git tag -d v0.1.1 && git push --delete origin v0.1.1`),
  then re-tag.
- Updater says "up to date" after release publishes → check
  `latest.json` is on the release and the version field matches.
- Signature error → see [`AUTOUPDATE.md`](./AUTOUPDATE.md#troubleshooting).

For deeper detail on how any of this works, read
[`AUTOUPDATE.md`](./AUTOUPDATE.md).
