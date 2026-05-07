import { useCallback, useEffect, useRef, useState } from "react";

import { clsx } from "clsx";

import { getPresignedUrl } from "../../lib/tauri";
import { displayNameForKey, formatBytes, formatRelativeTime } from "../../lib/utils";
import type { BucketFile } from "../../types";
import FileTypeIcon from "./FileTypeIcon";

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 320;

const IMAGE_EXTENSIONS = new Set(["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "ico"]);
const VIDEO_EXTENSIONS = new Set(["mp4", "webm", "mov", "m4v"]);
const AUDIO_EXTENSIONS = new Set(["mp3", "wav", "ogg", "m4a", "flac", "aac"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "json", "xml", "yaml", "yml", "toml",
  "js", "ts", "jsx", "tsx", "css", "scss", "less", "html", "htm",
  "py", "rb", "rs", "go", "java", "c", "cpp", "h", "hpp", "cs",
  "php", "swift", "kt", "sh", "bash", "zsh", "fish",
  "sql", "graphql", "prisma", "env", "gitignore", "dockerignore",
  "makefile", "dockerfile", "csv", "log", "ini", "conf", "cfg",
]);

const MAX_TEXT_SIZE = 500 * 1024;

function getFileExtension(filename: string): string {
  return filename.split(".").pop()?.toLowerCase() ?? "";
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  );
}

function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}

interface QuickPreviewProps {
  file: BucketFile;
  prefix: string;
  isStarred: boolean;
  onClose: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onToggleStar: () => void;
}

export default function QuickPreview({
  file,
  prefix,
  isStarred,
  onClose,
  onDownload,
  onDelete,
  onToggleStar,
}: QuickPreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isResizing = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isResizing.current = true;
    startX.current = e.clientX;
    startWidth.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const name = displayNameForKey(file.key, prefix);
  const ext = getFileExtension(name);
  const isImage = IMAGE_EXTENSIONS.has(ext);
  const isVideo = VIDEO_EXTENSIONS.has(ext);
  const isAudio = AUDIO_EXTENSIONS.has(ext);
  const isPdf = PDF_EXTENSIONS.has(ext);
  const isText = TEXT_EXTENSIONS.has(ext) || name.toLowerCase() === "makefile" || name.toLowerCase() === "dockerfile";
  const canPreview = isImage || isVideo || isAudio || isPdf || (isText && file.size <= MAX_TEXT_SIZE);

  useEffect(() => {
    if (!canPreview) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    setTextContent(null);
    setPreviewUrl(null);

    async function load() {
      try {
        const url = await getPresignedUrl(file.key, 3600);
        if (cancelled) return;

        if (isText) {
          const response = await fetch(url);
          if (!response.ok) throw new Error("Failed to fetch");
          const text = await response.text();
          if (!cancelled) {
            setTextContent(text);
          }
        } else {
          setPreviewUrl(url);
        }
      } catch (e) {
        if (!cancelled) {
          setError("Failed to load preview");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [file.key, canPreview, isText]);

  const previewContent = (
    <div className="flex h-full w-full items-center justify-center">
      {loading && (
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-accent-700" />
      )}
      
      {error && (
        <div className="flex flex-col items-center justify-center gap-2">
          <FileTypeIcon filename={name} isFolder={false} size="lg" />
          <p className="text-xs text-zinc-400">{error}</p>
        </div>
      )}
      
      {!loading && !error && (
        <>
          {isImage && previewUrl && (
            <img 
              alt={name} 
              className="max-h-full max-w-full rounded-md object-contain" 
              draggable={false}
              src={previewUrl} 
            />
          )}
          
          {isVideo && previewUrl && (
            <video 
              className="max-h-full max-w-full rounded-md" 
              controls 
              src={previewUrl}
            />
          )}
          
          {isAudio && previewUrl && (
            <div className="flex w-full flex-col items-center gap-4">
              <FileTypeIcon filename={name} isFolder={false} size="lg" />
              <audio className="w-full max-w-full" controls src={previewUrl} />
            </div>
          )}
          
          {isPdf && previewUrl && (
            <iframe
              className="h-full w-full rounded-md border-0"
              src={previewUrl}
              title={name}
            />
          )}
          
          {isText && textContent !== null && (
            <div className="h-full w-full overflow-auto rounded-md bg-zinc-900 p-3">
              <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap break-all">
                {textContent}
              </pre>
            </div>
          )}
          
          {!canPreview && (
            <div className="flex flex-col items-center justify-center gap-2">
              <FileTypeIcon filename={name} isFolder={file.isFolder} size="lg" />
              <p className="text-xs text-zinc-400">Preview not available</p>
              {isText && file.size > MAX_TEXT_SIZE && (
                <p className="text-xs text-zinc-400">File too large to preview</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-8">
        <div className="relative flex h-full w-full max-w-6xl flex-col rounded-xl bg-white overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <div className="flex items-center gap-3">
              <FileTypeIcon filename={name} isFolder={false} size="sm" />
              <div>
                <h3 className="text-sm font-medium text-zinc-900">{name}</h3>
                <p className="text-xs text-zinc-400">{formatBytes(file.size)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200"
                onClick={onDownload}
                type="button"
              >
                <DownloadIcon className="h-3.5 w-3.5" />
                Download
              </button>
              <button
                className="rounded-md p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
                onClick={() => setExpanded(false)}
                type="button"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center overflow-hidden bg-zinc-50 p-4">
            {previewContent}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative flex h-full flex-col border-l border-[0.5px] border-zinc-200 bg-white"
      style={{ width }}
    >
      <div
        className="absolute left-0 top-0 z-10 h-full w-1 cursor-col-resize hover:bg-accent-200 active:bg-accent-300"
        onMouseDown={handleMouseDown}
      />
      <div className="flex items-center justify-between border-b border-[0.5px] border-zinc-200 px-4 py-3">
        <h3 className="text-sm font-medium text-zinc-900">Preview</h3>
        <div className="flex items-center gap-1">
          {canPreview && (
            <button
              className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
              onClick={() => setExpanded(true)}
              title="Expand"
              type="button"
            >
              <ExpandIcon className="h-4 w-4" />
            </button>
          )}
          <button
            className="rounded-md p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600"
            onClick={onClose}
            type="button"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 min-h-0 items-center justify-center overflow-auto bg-zinc-50 p-3">
          {previewContent}
        </div>

        <div className="flex shrink-0 flex-col gap-4 border-t border-zinc-100 p-4">
          <div>
            <p className="text-sm font-medium text-zinc-900 break-all">{name}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {formatBytes(file.size)} · Modified {formatRelativeTime(file.lastModified)}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Type</span>
              <span className="text-zinc-600">{ext.toUpperCase() || "Unknown"}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Size</span>
              <span className="text-zinc-600">{formatBytes(file.size)}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400">Modified</span>
              <span className="text-zinc-600">{new Date(file.lastModified).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-[0.5px] border-zinc-200 p-3">
        <button
          className={clsx(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors",
            isStarred
              ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
              : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
          )}
          onClick={onToggleStar}
          type="button"
        >
          <StarIcon className="h-3.5 w-3.5" filled={isStarred} />
          {isStarred ? "Starred" : "Star"}
        </button>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-zinc-100 px-3 py-1.5 text-xs text-zinc-600 transition-colors hover:bg-zinc-200"
          onClick={onDownload}
          type="button"
        >
          <DownloadIcon className="h-3.5 w-3.5" />
          Download
        </button>
        <div className="flex-1" />
        <button
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500"
          onClick={onDelete}
          type="button"
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
