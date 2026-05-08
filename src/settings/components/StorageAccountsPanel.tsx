import { useState, type ChangeEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  rotateCredentialProfileSecret,
  updateCredentialProfile,
} from "../../lib/tauri";
import { handleTauriError } from "../../lib/utils";
import type { CredentialProfile } from "../../types";

interface StorageAccountsPanelProps {
  profiles: CredentialProfile[];
}

export default function StorageAccountsPanel({
  profiles,
}: StorageAccountsPanelProps) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [rotatingId, setRotatingId] = useState<string | null>(null);
  const [secret, setSecret] = useState("");

  const updateMut = useMutation({
    mutationFn: updateCredentialProfile,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["credential-profiles"] });
      await queryClient.invalidateQueries({ queryKey: ["connections"] });
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      setEditingId(null);
      toast.success("Storage account updated");
    },
    onError: (e) => toast.error(handleTauriError(e)),
  });

  const rotateMut = useMutation({
    mutationFn: rotateCredentialProfileSecret,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["activity"] });
      setRotatingId(null);
      setSecret("");
      toast.success("Secret rotated");
    },
    onError: (e) => toast.error(handleTauriError(e)),
  });

  function handleStartEdit(profile: CredentialProfile): void {
    setEditingId(profile.id);
    setLabel(profile.label);
  }

  function handleLabelChange(e: ChangeEvent<HTMLInputElement>): void {
    setLabel(e.target.value);
  }

  function handleSecretChange(e: ChangeEvent<HTMLInputElement>): void {
    setSecret(e.target.value);
  }

  function handleSaveLabel(): void {
    if (editingId == null) return;
    updateMut.mutate({ id: editingId, label });
  }

  function handleStartRotate(id: string): void {
    setRotatingId(id);
    setSecret("");
  }

  function handleRotate(): void {
    if (rotatingId == null || secret.trim() === "") return;
    rotateMut.mutate({ id: rotatingId, secretAccessKey: secret });
  }

  return (
    <section className="mb-8">
      <div className="mb-3">
        <p className="text-sm font-medium text-zinc-900">Storage Accounts</p>
        <p className="text-xs text-zinc-400">
          Secrets are stored once and shared by attached bucket connections.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border border-[0.5px] border-zinc-200 bg-white">
        {profiles.length === 0 ? (
          <p className="p-4 text-xs text-zinc-400">
            Saved accounts appear here after you add a connection.
          </p>
        ) : (
          profiles.map((profile) => (
            <div
              className="border-b border-[0.5px] border-zinc-100 p-4 last:border-b-0"
              key={profile.id}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  {editingId === profile.id ? (
                    <input
                      className="w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                      onChange={handleLabelChange}
                      value={label}
                    />
                  ) : (
                    <p className="truncate text-sm font-medium text-zinc-900">
                      {profile.label}
                    </p>
                  )}
                  <p className="mt-1 truncate text-xs text-zinc-400">
                    {profile.provider} · {profile.endpoint}
                  </p>
                  <p className="mt-1 text-[11px] text-zinc-300">
                    {profile.connectionCount} bucket connection
                    {profile.connectionCount === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  {editingId === profile.id ? (
                    <button
                      className="rounded-md bg-accent-700 px-2 py-1 text-[11px] font-medium text-white disabled:opacity-50"
                      disabled={updateMut.isPending}
                      onClick={handleSaveLabel}
                      type="button"
                    >
                      Save
                    </button>
                  ) : (
                    <button
                      className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
                      onClick={() => handleStartEdit(profile)}
                      type="button"
                    >
                      Rename
                    </button>
                  )}
                  <button
                    className="rounded-md border border-[0.5px] border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
                    onClick={() => handleStartRotate(profile.id)}
                    type="button"
                  >
                    Rotate
                  </button>
                </div>
              </div>
              {rotatingId === profile.id && (
                <div className="mt-3 flex gap-2">
                  <input
                    className="min-w-0 flex-1 rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                    onChange={handleSecretChange}
                    placeholder="New secret access key"
                    type="password"
                    value={secret}
                  />
                  <button
                    className="rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-50"
                    disabled={rotateMut.isPending || secret.trim() === ""}
                    onClick={handleRotate}
                    type="button"
                  >
                    Test & Save
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
