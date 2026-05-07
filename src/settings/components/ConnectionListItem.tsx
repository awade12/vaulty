import { clsx } from "clsx";

import type { ConnectionConfig } from "../../types";

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

interface ConnectionListItemProps {
  connection: ConnectionConfig;
  isActive: boolean;
  onActivate: (id: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onHealth: (id: string) => void;
  activateBusy: boolean;
  removeBusy: boolean;
  healthBusy: boolean;
}

export default function ConnectionListItem({
  connection,
  isActive,
  onActivate,
  onRemove,
  onEdit,
  onDuplicate,
  onHealth,
  activateBusy,
  removeBusy,
  healthBusy,
}: ConnectionListItemProps) {
  function handleActivateClick(): void {
    onActivate(connection.id);
  }

  function handleRemoveClick(): void {
    onRemove(connection.id);
  }

  function handleEditClick(): void {
    onEdit(connection.id);
  }

  function handleDuplicateClick(): void {
    onDuplicate(connection.id);
  }

  function handleHealthClick(): void {
    onHealth(connection.id);
  }

  return (
    <li
      className={clsx(
        "group flex items-center gap-3 rounded-xl border border-[0.5px] px-4 py-3",
        isActive
          ? "border-accent-200 bg-accent-50/50"
          : "border-zinc-200 bg-white hover:bg-zinc-50",
      )}
    >
      <div
        className={clsx(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
          isActive ? "bg-accent-700" : "bg-zinc-100",
        )}
      >
        <DatabaseIcon
          className={clsx("h-5 w-5", isActive ? "text-white" : "text-zinc-400")}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "truncate text-sm font-medium",
              isActive ? "text-zinc-900" : "text-zinc-900",
            )}
          >
            {connection.label}
          </span>
          {isActive && (
            <span className="flex items-center gap-1.5 rounded-md bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-600">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              Active
            </span>
          )}
        </div>
        <span className="text-xs text-zinc-400">{connection.bucket}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white hover:text-zinc-600 disabled:opacity-50"
          disabled={healthBusy}
          onClick={handleHealthClick}
          type="button"
        >
          Ping
        </button>
        <button
          className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white hover:text-zinc-600 disabled:opacity-50"
          onClick={handleEditClick}
          type="button"
        >
          Edit
        </button>
        <button
          className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-white hover:text-zinc-600 disabled:opacity-50"
          onClick={handleDuplicateClick}
          type="button"
        >
          Duplicate
        </button>
        <button
          className="rounded-lg px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          disabled={removeBusy}
          onClick={handleRemoveClick}
          type="button"
        >
          Remove
        </button>
      </div>
      <button
        className={clsx(
          "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50",
          isActive
            ? "bg-accent-700 text-white hover:bg-accent-800"
            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
        )}
        disabled={activateBusy}
        onClick={handleActivateClick}
        type="button"
      >
        {isActive ? "Refresh" : "Use"}
      </button>
    </li>
  );
}
