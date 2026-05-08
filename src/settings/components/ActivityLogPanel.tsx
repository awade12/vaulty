import type { ActivityEvent } from "../../types";

interface ActivityLogPanelProps {
  events: ActivityEvent[];
}

function formatTime(millis: number): string {
  return new Date(millis).toLocaleString();
}

export default function ActivityLogPanel({ events }: ActivityLogPanelProps) {
  return (
    <section className="mb-8">
      <div className="mb-3">
        <p className="text-sm font-medium text-zinc-900">Activity Log</p>
        <p className="text-xs text-zinc-400">
          Recent account, connection, and delete actions on this device.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-[0.5px] border-zinc-200 bg-white">
        {events.length === 0 ? (
          <p className="p-4 text-xs text-zinc-400">No activity recorded yet.</p>
        ) : (
          events.slice(0, 12).map((event) => (
            <div
              className="border-b border-[0.5px] border-zinc-100 p-3 last:border-b-0"
              key={event.id}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="truncate text-xs font-medium text-zinc-900">
                  {event.target}
                </p>
                <p className="shrink-0 text-[11px] text-zinc-300">
                  {formatTime(event.timestampMillis)}
                </p>
              </div>
              <p className="mt-1 text-xs text-zinc-400">{event.detail}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
