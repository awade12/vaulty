import { useEffect, useState } from "react";

import { clsx } from "clsx";

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
}

export default function FileThumbnail({ fileKey, filename, isFolder, size = "md" }: FileThumbnailProps) {
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

  const sizeClasses = {
    sm: "h-8 w-8 rounded-lg",
    md: "h-12 w-12 rounded-xl",
    lg: "h-16 w-16 rounded-xl",
  };

  if (showThumbnail && thumbnailUrl && !error) {
    return (
      <div className={clsx("relative overflow-hidden bg-zinc-100", sizeClasses[size])}>
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
    <div className={clsx(
      "flex items-center justify-center",
      sizeClasses[size],
      isFolder ? "bg-accent-50" : "bg-zinc-100"
    )}>
      <FileTypeIcon bare filename={filename} isFolder={isFolder} size={size} />
    </div>
  );
}
