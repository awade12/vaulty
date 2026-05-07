import { useEffect, useState } from "react";

import { clsx } from "clsx";

import {
  FOLDER_COLORS,
  FOLDER_STYLES,
  type FolderColor,
  type FolderStyle,
} from "../../lib/folderStyle";
import { getPresignedUrl } from "../../lib/tauri";
import FileTypeIcon from "./FileTypeIcon";

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "ico"]);

function isImageFile(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_EXTENSIONS.has(ext);
}

interface FileThumbnailProps {
  fileKey: string;
  filename: string;
  isFolder: boolean;
  size?: "sm" | "md" | "lg";
  folderColor?: FolderColor;
  folderStyle?: FolderStyle;
}

export default function FileThumbnail({
  fileKey,
  filename,
  isFolder,
  size = "md",
  folderColor = "default",
  folderStyle = "classic",
}: FileThumbnailProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const showThumbnail = !isFolder && isImageFile(filename);

  useEffect(() => {
    if (!showThumbnail) return;

    let cancelled = false;

    async function loadThumbnail() {
      try {
        const url = await getPresignedUrl(fileKey, 3600);
        if (!cancelled) {
          setThumbnailUrl(url);
        }
      } catch {
        if (!cancelled) {
          setError(true);
        }
      }
    }

    loadThumbnail();

    return () => {
      cancelled = true;
    };
  }, [fileKey, showThumbnail]);

  const sizeBox = {
    sm: "h-8 w-8",
    md: "h-12 w-12",
    lg: "h-16 w-16",
  };
  const styleTokens = FOLDER_STYLES[folderStyle];
  const folderTokens = FOLDER_COLORS[folderColor];
  const folderRadius = styleTokens.radius[size === "sm" ? "sm" : size === "md" ? "md" : "lg"];
  const fileRadius = { sm: "rounded-lg", md: "rounded-xl", lg: "rounded-xl" }[size];
  const wrapperRadius = isFolder ? folderRadius : fileRadius;
  const folderBg = styleTokens.background ? styleTokens.background(folderTokens) : folderTokens.bg;
  const folderRing = styleTokens.ring ?? "";

  if (showThumbnail && thumbnailUrl && !error) {
    return (
      <div className={clsx("relative overflow-hidden bg-zinc-100", sizeBox[size], wrapperRadius)}>
        <img
          alt=""
          className="h-full w-full object-cover"
          onError={() => setError(true)}
          src={thumbnailUrl}
        />
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "flex items-center justify-center",
        sizeBox[size],
        wrapperRadius,
        isFolder ? folderBg : "bg-zinc-100",
        isFolder && folderRing,
      )}
    >
      <FileTypeIcon
        bare
        filename={filename}
        folderColor={folderColor}
        folderStyle={folderStyle}
        isFolder={isFolder}
        size={size}
      />
    </div>
  );
}
