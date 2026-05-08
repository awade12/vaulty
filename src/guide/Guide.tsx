import { NavLink, Outlet, useLocation } from "react-router-dom";
import { clsx } from "clsx";

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 0 1-3-3m3 3a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3m-13.5 0V9a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 9v5.25m-4.5-8.625L12 3l-3.75 2.625" />
    </svg>
  );
}

function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
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

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function SparkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
  );
}

interface GuideNavItem {
  path: string;
  label: string;
  icon: typeof ServerIcon;
  description: string;
}

interface GuideNavSection {
  label: string;
  items: GuideNavItem[];
}

const GUIDE_SECTIONS: GuideNavSection[] = [
  {
    label: "Settings",
    items: [
      {
        path: "/guide/connections",
        label: "Connections",
        icon: DatabaseIcon,
        description: "Manage S3 connections",
      },
      {
        path: "/guide/preferences",
        label: "Preferences",
        icon: SettingsIcon,
        description: "App settings",
      },
      {
        path: "/guide/features",
        label: "Features",
        icon: SparkIcon,
        description: "What Vaulty can do",
      },
    ],
  },
  {
    label: "Setup Guides",
    items: [
      {
        path: "/guide/minio",
        label: "MinIO",
        icon: ServerIcon,
        description: "Self-hosted S3 storage",
      },
      {
        path: "/guide/providers",
        label: "Cloud Providers",
        icon: CloudIcon,
        description: "R2, S3, B2, Wasabi",
      },
    ],
  },
  {
    label: "About Vaulty",
    items: [
      {
        path: "/guide/security",
        label: "Security",
        icon: ShieldIcon,
        description: "How we protect your keys",
      },
    ],
  },
];

export default function Guide() {
  const location = useLocation();

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      <header className="flex h-12 items-center border-b border-[0.5px] border-zinc-200 bg-zinc-50 px-6">
        <SettingsIcon className="h-4 w-4 text-zinc-400" />
        <h1 className="ml-2 text-sm font-medium text-zinc-900">Settings</h1>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="flex w-44 flex-col border-r border-[0.5px] border-zinc-200 bg-zinc-50 px-2 py-3">
          <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
            {GUIDE_SECTIONS.map((section) => (
              <div key={section.label}>
                <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {section.label}
                </p>
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <NavLink
                      className={({ isActive }) => clsx(
                        "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors",
                        isActive
                          ? "bg-accent-50 text-accent-700 font-medium"
                          : "text-zinc-500 hover:bg-white hover:text-zinc-700"
                      )}
                      key={item.path}
                      to={item.path}
                    >
                      <div className={clsx(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                        location.pathname === item.path ? "bg-accent-700" : "bg-zinc-100"
                      )}>
                        <item.icon className={clsx(
                          "h-3.5 w-3.5",
                          location.pathname === item.path ? "text-white" : "text-zinc-400"
                        )} />
                      </div>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 flex-1 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
