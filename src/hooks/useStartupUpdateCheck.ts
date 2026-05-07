import { useEffect } from "react";

import { isTauri } from "@tauri-apps/api/core";
import { check } from "@tauri-apps/plugin-updater";
import { toast } from "sonner";

// Storage key for "user told us to skip this version".
const SKIPPED_VERSION_KEY = "vaulty.update.skippedVersion";
// Don't bother the user more than once per session even if they ignore us.
const SESSION_NOTIFIED_KEY = "vaulty.update.sessionNotified";
// Wait this long after launch so we don't compete with first paint.
const STARTUP_DELAY_MS = 10_000;

/**
 * Quiet background update check on app launch. If a new version is available
 * and the user hasn't already skipped it, surface a toast pointing to
 * Settings → Updates. Failures are intentionally silent — the manual
 * "Check for updates" button is the source of truth for diagnostics.
 */
export function useStartupUpdateCheck(): void {
  useEffect(() => {
    if (!isTauri()) return;
    if (sessionStorage.getItem(SESSION_NOTIFIED_KEY) === "1") return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const update = await check();
        if (cancelled || update == null) return;
        const skipped = localStorage.getItem(SKIPPED_VERSION_KEY);
        if (skipped === update.version) return;

        sessionStorage.setItem(SESSION_NOTIFIED_KEY, "1");
        toast.info(`Vaulty ${update.version} is available`, {
          description: "Open Settings → Updates to install.",
          duration: 12_000,
          action: {
            label: "Skip",
            onClick: () => {
              localStorage.setItem(SKIPPED_VERSION_KEY, update.version);
            },
          },
        });
      } catch {
        // Network errors, signature errors, etc. — keep quiet on launch.
        // The user can still trigger a manual check from Settings.
      }
    }, STARTUP_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);
}
