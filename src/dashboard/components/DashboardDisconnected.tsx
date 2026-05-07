import { Link } from "react-router-dom";

import CloudOffIcon from "./CloudOffIcon";

export default function DashboardDisconnected() {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
        <CloudOffIcon className="h-6 w-6 text-zinc-400" />
      </div>
      <p className="text-sm font-medium text-zinc-900">No connection active</p>
      <p className="mt-1 max-w-xs text-center text-xs text-zinc-500">
        Connect to an S3-compatible bucket to browse and manage your files
      </p>
      <Link
        className="mt-4 rounded-md bg-accent-700 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-800 active:bg-accent-950"
        to="/settings"
      >
        Go to Settings
      </Link>
    </div>
  );
}
