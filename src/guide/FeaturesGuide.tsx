function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
    </svg>
  );
}

function ArrowUpTrayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

interface FeatureGroup {
  title: string;
  description: string;
  icon: typeof DatabaseIcon;
  features: string[];
}

const FEATURE_GROUPS: FeatureGroup[] = [
  {
    title: "Connections",
    description: "Work across S3-compatible providers from one desktop app.",
    icon: DatabaseIcon,
    features: [
      "Save multiple bucket connections",
      "Switch active buckets from the sidebar",
      "Discover account buckets and add them in bulk",
      "Duplicate, edit, health-check, and remove saved connections",
      "Provider presets for AWS S3, Cloudflare R2, Backblaze B2, Wasabi, MinIO",
    ],
  },
  {
    title: "Browsing & Organization",
    description: "Navigate bucket contents with desktop-style file controls.",
    icon: FolderIcon,
    features: [
      "Grid and list views",
      "Breadcrumb folder navigation",
      "Create, rename, move, duplicate, and delete",
      "Drag files onto folders to move them",
      "Customize folder style and colors",
      "Pin frequently used prefixes",
      "Filter current folder or run recursive search",
    ],
  },
  {
    title: "Uploads & Downloads",
    description: "Move local files in and out of buckets with progress feedback.",
    icon: ArrowUpTrayIcon,
    features: [
      "Upload files, multiple files, or whole folders",
      "Drag and drop onto folders",
      "Quick upload from tray or global shortcut",
      "Download single files, selections, or ZIP archives",
      "Resolve conflicts by replacing, keeping both, or skipping",
      "Watch a local folder and sync changes",
      "Sync modes: copy only, move after upload, two-way, or mirror",
      "Copy or move selected files and folders to another bucket",
    ],
  },
  {
    title: "Preview & Sharing",
    description: "Check objects before downloading and share with presigned links.",
    icon: EyeIcon,
    features: [
      "Preview images, video, audio, PDFs, and code files",
      "Open objects with the system default app",
      "Presigned share links (15 min to 7 days)",
      "View metadata, storage class, and versioning status",
      "View and download previous versions",
      "Cleanup views for old, large, or duplicate files",
      "Usage summary for total size, largest prefixes, and file types",
    ],
  },
  {
    title: "Desktop & Security",
    description: "Native app behaviors with local credential protection.",
    icon: ShieldIcon,
    features: [
      "Credentials stored in OS keychain",
      "Secrets never written to config files",
      "System tray quick actions",
      "Global quick-upload shortcut",
      "Auto-update checks",
      "macOS drag-out export to Finder",
    ],
  },
];

export default function FeaturesGuide() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-sm font-medium text-zinc-900">Features</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Everything Vaulty can do for your S3-compatible storage.
          </p>
        </div>

        <div className="space-y-4">
          {FEATURE_GROUPS.map((group) => (
            <section
              className="rounded-lg border border-[0.5px] border-zinc-200 bg-white overflow-hidden"
              key={group.title}
            >
              <div className="flex items-center gap-3 border-b border-[0.5px] border-zinc-100 bg-zinc-50 px-4 py-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent-50">
                  <group.icon className="h-4 w-4 text-accent-700" />
                </div>
                <div>
                  <h2 className="text-xs font-medium text-zinc-900">{group.title}</h2>
                  <p className="text-[11px] text-zinc-400">{group.description}</p>
                </div>
              </div>
              <div className="p-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {group.features.map((feature) => (
                    <div className="flex items-start gap-2" key={feature}>
                      <CheckIcon className="mt-0.5 h-3 w-3 shrink-0 text-green-500" />
                      <p className="text-xs text-zinc-600">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
