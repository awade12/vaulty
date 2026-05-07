import { useEffect } from "react";

import { defaultWindowIcon } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { Image } from "@tauri-apps/api/image";
import { Menu, MenuItem, PredefinedMenuItem } from "@tauri-apps/api/menu";
import { resolveResource } from "@tauri-apps/api/path";
import { TrayIcon } from "@tauri-apps/api/tray";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { open } from "@tauri-apps/plugin-dialog";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";
import { toast } from "sonner";

import { handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";

const TRAY_ID = "vaulty-tray";
const QUICK_UPLOAD_SHORTCUT = "CommandOrControl+Shift+U";

async function runQuickUploadPicker(): Promise<void> {
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
  const selected = await open({ multiple: true });
  if (selected == null) {
    return;
  }
  const paths = Array.isArray(selected) ? selected : [selected];
  useBucketStore.getState().openQuickUpload(paths);
}

async function focusVaultyWindow(): Promise<void> {
  const win = getCurrentWindow();
  await win.show();
  await win.setFocus();
}

export function useDesktopQuickActions(): void {
  useEffect(() => {
    if (!isTauri()) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const sep = await PredefinedMenuItem.new({ item: "Separator" });
        if (cancelled) {
          return;
        }
        const quit = await PredefinedMenuItem.new({ item: "Quit" });
        if (cancelled) {
          return;
        }

        const uploadItem = await MenuItem.new({
          id: "quick-upload",
          text: "Upload to Vaulty…",
          accelerator: "CmdOrControl+Shift+U",
          action: () => {
            void runQuickUploadPicker();
          },
        });
        if (cancelled) {
          return;
        }

        const openItem = await MenuItem.new({
          id: "open-main",
          text: "Open Vaulty",
          action: () => {
            void focusVaultyWindow();
          },
        });
        if (cancelled) {
          return;
        }

        const menu = await Menu.new({
          items: [uploadItem, openItem, sep, quit],
        });
        if (cancelled) {
          return;
        }

        let trayIcon: Image | null = null;
        try {
          const iconPath = await resolveResource("icons/32x32.png");
          trayIcon = await Image.fromPath(iconPath);
        } catch {
          trayIcon = null;
        }
        if (cancelled) {
          return;
        }

        if (trayIcon == null) {
          trayIcon = await defaultWindowIcon();
        }
        if (cancelled) {
          return;
        }

        await TrayIcon.removeById(TRAY_ID).catch(() => undefined);
        if (cancelled) {
          return;
        }

        await TrayIcon.new({
          id: TRAY_ID,
          menu,
          tooltip: "Vaulty — menu bar upload",
          icon: trayIcon ?? undefined,
          showMenuOnLeftClick: true,
        });
        if (cancelled) {
          void TrayIcon.removeById(TRAY_ID).catch(() => undefined);
          return;
        }

        await register(QUICK_UPLOAD_SHORTCUT, (event) => {
          if (event.state === "Pressed") {
            void runQuickUploadPicker();
          }
        });
      } catch (err) {
        toast.error(`Menu bar shortcuts: ${handleTauriError(err)}`);
      }
    })();

    return () => {
      cancelled = true;
      void unregister(QUICK_UPLOAD_SHORTCUT).catch(() => undefined);
      void TrayIcon.removeById(TRAY_ID).catch(() => undefined);
    };
  }, []);
}
