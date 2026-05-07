import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";

interface NewFolderModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
  isPending: boolean;
}

export default function NewFolderModal({
  open,
  onClose,
  onCreate,
  isPending,
}: NewFolderModalProps) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  function handleBackdropMouseDown(): void {
    if (!isPending) {
      onClose();
    }
  }

  function handleCancelClick(): void {
    if (!isPending) {
      onClose();
    }
  }

  function handleCreateClick(): void {
    onCreate(name);
  }

  function handleNameChange(e: ChangeEvent<HTMLInputElement>): void {
    setName(e.target.value);
  }

  function handleFormSubmit(e: FormEvent): void {
    e.preventDefault();
    handleCreateClick();
  }

  return (
    <div
      aria-labelledby="new-folder-title"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/20 p-4"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-[0.5px] border-zinc-200 bg-white p-4"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <h2
          className="text-sm font-medium text-zinc-900"
          id="new-folder-title"
        >
          New folder
        </h2>
        <form className="mt-3" onSubmit={handleFormSubmit}>
          <input
            autoFocus
            className="w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-300 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40"
            onChange={handleNameChange}
            placeholder="Folder name"
            type="text"
            value={name}
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-50"
              disabled={isPending}
              onClick={handleCancelClick}
              type="button"
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-accent-700 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-accent-800 active:bg-accent-950 disabled:opacity-50"
              disabled={isPending}
              type="submit"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
