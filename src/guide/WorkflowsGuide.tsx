interface Workflow {
  title: string;
  description: string;
  steps: string[];
  notes?: string[];
}

const WORKFLOWS: Workflow[] = [
  {
    title: "Reuse One Storage Account Across Buckets",
    description:
      "Use this when many buckets share the same provider endpoint and access keys.",
    steps: [
      "Open Settings, then Connections.",
      "Add the first bucket with provider, endpoint, access key, and secret.",
      "For the next bucket, choose the saved Storage Account from the form.",
      "Enter only the connection name and bucket name, then save.",
    ],
    notes: [
      "The secret is stored once in the OS keychain.",
      "Each bucket connection points back to the same storage account profile.",
    ],
  },
  {
    title: "Rename or Rotate a Storage Account",
    description:
      "Manage shared account metadata without editing every bucket connection.",
    steps: [
      "Open Settings, then Connections.",
      "Find the account in Storage Accounts.",
      "Use Rename to change the display name.",
      "Use Rotate to paste a new secret access key.",
      "Click Test & Save. Vaulty tests every attached bucket before saving the new secret.",
    ],
    notes: [
      "A bad rotated secret is rejected before it replaces the working one.",
      "Rotation affects every bucket attached to that storage account.",
    ],
  },
  {
    title: "Move a Bucket to Another Storage Account",
    description:
      "Use this when a bucket was saved under the wrong account or after migrating keys.",
    steps: [
      "Open Settings, then Connections.",
      "Click Edit on the bucket connection.",
      "Use Move to storage account under the form.",
      "Choose the target storage account.",
      "Vaulty tests the bucket with the target account before saving the move.",
    ],
    notes: [
      "The bucket name and label stay the same.",
      "Provider, endpoint, region, and access key come from the new storage account.",
    ],
  },
  {
    title: "Check Account Permissions",
    description:
      "Verify whether a storage account can list, write, and delete against its attached buckets.",
    steps: [
      "Open Settings, then Connections.",
      "Find the account in Storage Accounts.",
      "Click Permissions.",
      "Read the report for list, write, and delete results.",
    ],
    notes: [
      "The write/delete check uses a temporary Vaulty marker object.",
      "Failures show which bucket and operation failed.",
    ],
  },
  {
    title: "Discover and Add Many Buckets",
    description:
      "Use discovery when one account can see many buckets and you do not want to enter them one by one.",
    steps: [
      "Start a new connection and enter provider, endpoint, access key, and secret.",
      "Click Discover buckets.",
      "Use search to narrow the bucket list.",
      "Turn on Hide already saved buckets if you only want new buckets.",
      "Use Select unsaved visible or Invert visible to shape the selection.",
      "Click Add connections.",
    ],
    notes: [
      "Already saved buckets are marked and disabled.",
      "Bulk-add results appear in Operation History with added, skipped, and failed counts.",
    ],
  },
  {
    title: "Review Operation History",
    description:
      "Use Operation History to see recent local actions and bulk-operation results.",
    steps: [
      "Open Settings, then Connections.",
      "Scroll to Operation History.",
      "Review recent account changes, connection changes, deletes, and bulk-add summaries.",
    ],
    notes: [
      "This is local app history, not a provider-side audit log.",
      "It helps confirm what Vaulty did from this machine.",
    ],
  },
  {
    title: "Preview a Dangerous Delete",
    description:
      "Vaulty runs a dry-run preview before bulk and folder deletes so you can see the scope first.",
    steps: [
      "Select multiple files, or choose delete on a folder.",
      "Read the confirmation modal before confirming.",
      "Check object count, total size when available, sample keys, and truncation warnings.",
      "Type the required confirmation text if shown.",
      "Confirm only when the preview matches what you intended.",
    ],
    notes: [
      "Folder previews are capped to protect you from accidentally scanning huge buckets forever.",
      "If the preview is truncated, narrow the folder prefix before deleting.",
    ],
  },
  {
    title: "Compare Two Buckets Before Syncing",
    description:
      "Use compare as a dry-run before moving, copying, or manually syncing buckets.",
    steps: [
      "Open the source bucket in Files.",
      "Open the more menu in the dashboard toolbar.",
      "Choose Compare buckets.",
      "Pick a target bucket connection.",
      "Click Dry-run compare.",
      "Review source-only, target-only, and changed object counts.",
    ],
    notes: [
      "This does not copy, move, or delete anything.",
      "The current folder prefix is used, so open a folder first if you only want to compare part of a bucket.",
    ],
  },
  {
    title: "Search Across All Buckets",
    description:
      "Use global search when you do not know which bucket contains an object.",
    steps: [
      "Press Cmd+K on macOS or Ctrl+K on Windows/Linux.",
      "Type at least two characters.",
      "Choose Search all buckets.",
      "Pick a result to switch to that bucket.",
    ],
    notes: [
      "Global search scans connected buckets and caps results to stay responsive.",
      "Use more specific terms if the result says the scan was truncated.",
    ],
  },
  {
    title: "Use the Command Palette",
    description:
      "The command palette is the fastest way to jump between buckets and common areas.",
    steps: [
      "Press Cmd+K or Ctrl+K.",
      "Type a bucket, connection, or object search term.",
      "Choose a bucket to switch to it.",
      "Choose Open Connections to jump to account and connection management.",
      "Choose Search all buckets to run a global object search.",
    ],
  },
];

export default function WorkflowsGuide() {
  return (
    <div className="h-full overflow-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-sm font-medium text-zinc-900">Workflows</h1>
          <p className="mt-1 text-xs text-zinc-500">
            Step-by-step guides for the account, search, compare, and safety tools.
          </p>
        </div>

        <div className="space-y-4">
          {WORKFLOWS.map((workflow) => (
            <section
              className="rounded-lg border border-[0.5px] border-zinc-200 bg-white p-4"
              key={workflow.title}
            >
              <h2 className="text-sm font-medium text-zinc-900">
                {workflow.title}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-zinc-500">
                {workflow.description}
              </p>
              <ol className="mt-4 space-y-2">
                {workflow.steps.map((step, index) => (
                  <li className="flex gap-2 text-xs text-zinc-600" key={step}>
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[10px] font-semibold text-accent-700">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
              {workflow.notes != null && (
                <div className="mt-4 rounded-md bg-zinc-50 p-3">
                  {workflow.notes.map((note) => (
                    <p className="text-[11px] leading-relaxed text-zinc-400" key={note}>
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
