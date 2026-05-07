import { type ChangeEvent, type FormEvent, useEffect, useState } from "react";

import { clsx } from "clsx";

interface ConfirmDeleteModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  requireMatch: string | null;
  isPending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  open,
  title,
  description,
  confirmLabel,
  requireMatch,
  isPending,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) {
      setTyped("");
    }
  }, [open, requireMatch]);

  if (!open) {
    return null;
  }

  const needsMatch = requireMatch != null && requireMatch.length > 0;
  const canConfirm =
    !needsMatch || (typed === requireMatch && typed.length > 0);

  function handleBackdropMouseDown(): void {
    if (!isPending) {
      onCancel();
    }
  }

  function handleConfirmClick(): void {
    onConfirm();
  }

  function handleFormSubmit(e: FormEvent): void {
    e.preventDefault();
    if (!needsMatch || typed === requireMatch) {
      onConfirm();
    }
  }

  function handleTypedChange(e: ChangeEvent<HTMLInputElement>): void {
    setTyped(e.target.value);
  }

  return (
    <div
      aria-labelledby="confirm-delete-title"
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
          id="confirm-delete-title"
        >
          {title}
        </h2>
        <p className="mt-2 text-[11px] leading-relaxed text-zinc-500">
          {description}
        </p>
        <form className="mt-4" onSubmit={handleFormSubmit}>
          {needsMatch && requireMatch != null && (
            <div className="mt-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
                Type{" "}
                <span className="font-mono text-zinc-900 normal-case">
                  {requireMatch}
                </span>{" "}
                to confirm
              </p>
              <input
                className="w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 font-mono text-xs text-zinc-900 placeholder:text-zinc-300 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                onChange={handleTypedChange}
                placeholder={requireMatch}
                type="text"
                value={typed}
              />
            </div>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:bg-zinc-50 hover:text-zinc-600 disabled:opacity-50"
              disabled={isPending}
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className={clsx(
                "rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-50",
                !canConfirm && "pointer-events-none opacity-40",
              )}
              disabled={isPending || !canConfirm}
              onClick={handleConfirmClick}
              type="submit"
            >
              {confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
