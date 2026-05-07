import { join } from "@tauri-apps/api/path";
import { open, save } from "@tauri-apps/plugin-dialog";

import { usePreferencesStore } from "../store/preferencesStore";

function normalizeOpenResult(result: string | string[] | null): string | null {
  if (result == null) {
    return null;
  }
  return Array.isArray(result) ? result[0] ?? null : result;
}

export async function resolveFileDownloadPath(filename: string): Promise<string | null> {
  const safeName = filename.trim().length > 0 ? filename.trim() : "download";
  const { defaultDownloadFolder, alwaysPromptDownloadLocation } =
    usePreferencesStore.getState();

  if (
    defaultDownloadFolder != null &&
    defaultDownloadFolder.length > 0 &&
    !alwaysPromptDownloadLocation
  ) {
    return await join(defaultDownloadFolder, safeName);
  }

  const defaultPath =
    defaultDownloadFolder != null && defaultDownloadFolder.length > 0
      ? await join(defaultDownloadFolder, safeName)
      : safeName;

  return save({
    defaultPath,
    title: "Save file",
  });
}

export async function resolveBulkDownloadFolder(): Promise<string | null> {
  const { defaultDownloadFolder, alwaysPromptDownloadLocation } =
    usePreferencesStore.getState();

  if (
    defaultDownloadFolder != null &&
    defaultDownloadFolder.length > 0 &&
    !alwaysPromptDownloadLocation
  ) {
    return defaultDownloadFolder;
  }

  const picked = await open({
    directory: true,
    multiple: false,
    title: "Choose download folder",
    defaultPath: defaultDownloadFolder ?? undefined,
  });

  return normalizeOpenResult(picked);
}

export async function resolveZipSavePath(suggestedName: string): Promise<string | null> {
  const { defaultDownloadFolder, alwaysPromptDownloadLocation } =
    usePreferencesStore.getState();

  if (
    defaultDownloadFolder != null &&
    defaultDownloadFolder.length > 0 &&
    !alwaysPromptDownloadLocation
  ) {
    return await join(defaultDownloadFolder, suggestedName);
  }

  const defaultPath =
    defaultDownloadFolder != null && defaultDownloadFolder.length > 0
      ? await join(defaultDownloadFolder, suggestedName)
      : suggestedName;

  return save({
    defaultPath,
    title: "Save ZIP",
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
}
