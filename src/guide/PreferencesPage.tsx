import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState } from "react";

import AppearancePreferences from "../settings/components/AppearancePreferences";
import DownloadsPreferences from "../settings/components/DownloadsPreferences";
import UpdatesPreferences from "../settings/components/UpdatesPreferences";

export default function PreferencesPage() {
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    if (!isTauri()) return;
    void getVersion().then(setAppVersion);
  }, []);

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-medium text-zinc-900 mb-1">Preferences</h1>
            <p className="text-sm text-zinc-500">
              Configure app behavior and appearance.
            </p>
          </div>
          {appVersion != null && (
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-mono text-[11px] text-zinc-500">
              v{appVersion}
            </span>
          )}
        </div>

        <div className="space-y-2">
          <DownloadsPreferences />
          <AppearancePreferences />
          <UpdatesPreferences />
        </div>
      </div>
    </div>
  );
}
