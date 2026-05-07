# Vaulty

A desktop app for managing S3-compatible cloud storage. Browse, upload, download, and organize files across buckets from AWS S3, Cloudflare R2, Backblaze B2, MinIO, Wasabi, and any other S3-compatible provider.

Built with [Tauri 2](https://tauri.app/), React, TypeScript, and Rust.

## Install

Download the latest build for your OS from the
[**latest release**](https://github.com/awade12/vaulty/releases/latest):

| Platform | File |
|---|---|
| macOS (Apple Silicon + Intel, universal) | `vaulty_*_universal.dmg` |
| Windows | `vaulty_*_x64-setup.exe` |
| Linux | `vaulty_*_amd64.AppImage` |

Vaulty isn't yet code-signed, so the OS will warn on first launch:

- **macOS** — right-click the app → **Open** → **Open** again. Only needed once.
- **Windows** — SmartScreen → **More info** → **Run anyway**.
- **Linux** — `chmod +x vaulty_*.AppImage && ./vaulty_*.AppImage`.

After install, Vaulty checks for updates from **Settings → Updates** and
applies them silently.

## Features

- **Multiple connections** — save and switch between any number of S3-compatible buckets
- **File browser** — navigate folders with breadcrumb navigation, grid or list view
- **Upload** — drag & drop or click to upload; bulk uploads with real-time progress
- **Quick upload** — global shortcut (`Cmd/Ctrl+Shift+U`) and system tray menu for uploading without opening the app
- **Download** — single files, bulk selection, or zip download for multiple files
- **File operations** — rename, move, duplicate, delete (with confirmation), create folders
- **Version history** — view and restore previous versions of objects
- **Bucket discovery** — list all buckets on an account and add them in bulk
- **Secure credentials** — secrets stored in the OS keychain via `keyring`, never written to disk in plaintext

## Tech Stack

| Layer | Tech |
|---|---|
| Desktop shell | Tauri 2 (Rust) |
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS 4 |
| State | Zustand + TanStack Query |
| S3 client | `aws-sdk-s3` (Rust) |
| Credentials | `keyring` (OS keychain) |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable toolchain — see `rust-toolchain.toml`)
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) for your OS

### Install & run

```bash
npm install
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Produces a native installer for your platform in `src-tauri/target/release/bundle/`.

## Adding a Connection

1. Open **Settings** (sidebar)
2. Fill in your provider, endpoint, bucket, region (optional), and access credentials
3. Click **Save** — Vaulty tests the connection before saving
4. Use **Discover buckets** to list all buckets on an account and add them in bulk

Credentials are stored in your OS keychain (macOS Keychain, Windows Credential Manager, or the system secret store on Linux).

## Project Structure

```
src/                  # React frontend
  components/         # Shared UI components
  dashboard/          # File browser view
  settings/           # Connection management view
  hooks/              # React Query + Tauri hooks
  lib/
    tauri.ts          # All invoke() calls (never call invoke directly in components)
    utils.ts          # Pure utilities
  store/
    bucketStore.ts    # Zustand global state
  types/              # Shared TypeScript types

src-tauri/src/        # Rust backend
  commands/           # Tauri command handlers (connection, upload, download, etc.)
  s3/                 # AWS SDK client + S3 operations
  storage/            # Persistent connection config + keychain credential helpers
```
