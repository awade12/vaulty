import { clsx } from "clsx";

import { getProviderConfig } from "../../components/ProviderIcons";
import type { ConnectionConfig } from "../../types";

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
        "group flex items-center gap-4 rounded-lg border border-[0.5px] px-4 py-3",
        isActive
          ? "border-accent-200 bg-accent-50/50"
          : "border-zinc-200 bg-white",
      )}
    >
      {(() => {
        const config = getProviderConfig(connection.provider);
        const ProviderIcon = config.icon;
        return (
          <div
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              isActive ? "bg-zinc-900" : "bg-zinc-100",
            )}
          >
            <ProviderIcon
              className={clsx("h-4 w-4", isActive ? "text-white" : config.color)}
            />
          </div>
        );
      })()}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-zinc-900">
            {connection.label}
          </span>
          {isActive && (
            <span className="flex h-1.5 w-1.5 rounded-full bg-green-500" />
          )}
        </div>
        <span className="text-xs text-zinc-400">{connection.bucket}</span>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
          disabled={healthBusy}
          onClick={handleHealthClick}
          type="button"
        >
          Ping
        </button>
        <button
          className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          onClick={handleEditClick}
          type="button"
        >
          Edit
        </button>
        <button
          className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          onClick={handleDuplicateClick}
          type="button"
        >
          Clone
        </button>
        <button
          className="rounded-md px-2 py-1 text-[11px] text-zinc-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          disabled={removeBusy}
          onClick={handleRemoveClick}
          type="button"
        >
          Delete
        </button>
      </div>
      <button
        className={clsx(
          "shrink-0 rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50",
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
