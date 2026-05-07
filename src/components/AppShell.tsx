import { useState } from "react";

import { clsx } from "clsx";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { useConnectionsQuery } from "../hooks/useConnectionsQuery";
import { useRestoreSession } from "../hooks/useRestoreSession";
import { activateConnection } from "../lib/tauri";
import { handleTauriError } from "../lib/utils";
import { useBucketStore } from "../store/bucketStore";

function FilesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function VaultIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

export default function AppShell() {
  useRestoreSession();
  const navigate = useNavigate();
  const { data: connections = [] } = useConnectionsQuery();
  const activeConnectionId = useBucketStore((s) => s.activeConnectionId);
  const setActiveConnectionId = useBucketStore((s) => s.setActiveConnectionId);
  const setSessionReady = useBucketStore((s) => s.setSessionReady);
  const setIsSwitchingConnection = useBucketStore((s) => s.setIsSwitchingConnection);
  
  const [connectionsExpanded, setConnectionsExpanded] = useState(true);
  const [switchingTo, setSwitchingTo] = useState<string | null>(null);

  async function handleSwitchConnection(id: string) {
    if (id === activeConnectionId) {
      navigate("/");
      return;
    }
    setSwitchingTo(id);
    setIsSwitchingConnection(true);
    try {
      await activateConnection(id);
      setActiveConnectionId(id);
      setSessionReady(true);
      navigate("/");
      toast.success("Switched connection");
    } catch (e) {
      toast.error(handleTauriError(e));
    } finally {
      setSwitchingTo(null);
      setIsSwitchingConnection(false);
    }
  }

  const activeConnection = connections.find((c) => c.id === activeConnectionId);

  return (
    <div className="flex h-screen bg-white">
      <aside className="flex w-52 flex-col border-r border-[0.5px] border-zinc-200 bg-zinc-50">
        <div className="flex h-12 items-center gap-2.5 px-4">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-700">
            <VaultIcon className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-medium text-zinc-900">Vaulty</span>
        </div>
        
        <div className="flex flex-1 flex-col overflow-y-auto px-2 py-2">
          <p className="mb-2 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Menu
          </p>
          <nav className="flex flex-col gap-1">
            <div>
              <button
                className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-zinc-900 bg-white"
                onClick={() => setConnectionsExpanded(!connectionsExpanded)}
                type="button"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-50">
                  <FilesIcon className="h-4 w-4 text-accent-700" />
                </div>
                <span className="flex-1 text-left">Files</span>
                <ChevronDownIcon className={clsx(
                  "h-3.5 w-3.5 text-zinc-400 transition-transform",
                  !connectionsExpanded && "-rotate-90"
                )} />
              </button>
              
              {connectionsExpanded && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5 border-l border-zinc-200 pl-2">
                  {connections.length === 0 ? (
                    <p className="px-2 py-2 text-[11px] text-zinc-400">
                      No connections yet
                    </p>
                  ) : (
                    connections.map((conn) => (
                      <button
                        className={clsx(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                          conn.id === activeConnectionId
                            ? "bg-accent-50 text-accent-700 font-medium"
                            : "text-zinc-500 hover:bg-white hover:text-zinc-700"
                        )}
                        disabled={switchingTo !== null}
                        key={conn.id}
                        onClick={() => handleSwitchConnection(conn.id)}
                        type="button"
                      >
                        <div className={clsx(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
                          conn.id === activeConnectionId ? "bg-accent-700" : "bg-zinc-100"
                        )}>
                          <DatabaseIcon className={clsx(
                            "h-3 w-3",
                            conn.id === activeConnectionId ? "text-white" : "text-zinc-400"
                          )} />
                        </div>
                        <span className="min-w-0 flex-1 truncate">{conn.label}</span>
                        {switchingTo === conn.id && (
                          <div className="h-3 w-3 shrink-0 animate-spin rounded-full border-[1.5px] border-zinc-200 border-t-accent-700" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            
            <NavLink
              className={({ isActive }) => clsx(
                "flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors",
                isActive
                  ? "bg-white text-zinc-900 font-medium"
                  : "text-zinc-500 hover:bg-white hover:text-zinc-700"
              )}
              to="/settings"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-zinc-100">
                <SettingsIcon className="h-4 w-4 text-zinc-400" />
              </div>
              Settings
            </NavLink>
          </nav>
        </div>
        
        <div className="border-t border-[0.5px] border-zinc-200 px-4 py-3">
          <p className="text-[11px] text-zinc-400">
            {activeConnection ? activeConnection.bucket : "No connection"}
          </p>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
