import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import type { ConnectionConfig, ListBucketsCredentials } from "../../types";
import {
  PROVIDER_PRESETS,
  applyPreset,
  detectPreset,
  type PresetField,
} from "../providerPresets";

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      viewBox="0 0 24 24"
    >
      <path
        d="M12 4.5v15m7.5-7.5h-15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface ConnectionFormValues {
  label: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

interface ConnectionFormProps {
  isPending: boolean;
  onSubmit: (values: ConnectionFormValues) => void;
  draft?: ConnectionConfig | null;
  onCancelDraft?: () => void;
  onDiscoverRequest?: (credentials: ListBucketsCredentials) => void;
}

const inputClass =
  "w-full rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200/40";

export default function ConnectionForm({
  isPending,
  onSubmit,
  draft,
  onCancelDraft,
  onDiscoverRequest,
}: ConnectionFormProps) {
  const isEdit = draft != null;
  const formRef = useRef<HTMLFormElement>(null);

  // Pick a sensible default preset: when editing, detect from existing
  // endpoint; otherwise default to R2 (most common case for this app).
  const initialPreset =
    (draft != null ? detectPreset(draft.endpoint) : null) ??
    PROVIDER_PRESETS[0]!;
  const [presetId, setPresetId] = useState<string>(initialPreset.id);
  const preset =
    PROVIDER_PRESETS.find((p) => p.id === presetId) ?? initialPreset;

  // Per-preset placeholder values (account ID, region, custom host).
  const [presetValues, setPresetValues] = useState<
    Partial<Record<PresetField, string>>
  >({});
  // Endpoint shown in the input — synthesized from preset + values, or
  // overridden when the user types into it directly.
  const [endpoint, setEndpoint] = useState<string>(draft?.endpoint ?? "");
  const [endpointTouched, setEndpointTouched] = useState<boolean>(
    draft != null,
  );
  const [region, setRegion] = useState<string>(
    draft?.region ?? preset.defaultRegion,
  );

  // When the preset changes, reset placeholder values, region default, and
  // the synthesized endpoint (unless the user already edited it manually).
  useEffect(() => {
    setPresetValues({});
    if (!endpointTouched) {
      setEndpoint("");
    }
    setRegion(preset.defaultRegion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetId]);

  // Re-synthesize endpoint as preset placeholders are filled in.
  useEffect(() => {
    if (endpointTouched) return;
    const applied = applyPreset(preset, presetValues);
    setEndpoint(applied.endpoint);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetValues, presetId]);

  function handlePresetFieldChange(key: PresetField, value: string): void {
    setPresetValues((prev) => ({ ...prev, [key]: value }));
    if (key === "region") setRegion(value);
  }

  function handleDiscoverClick(): void {
    if (onDiscoverRequest == null) {
      return;
    }
    const form = formRef.current;
    if (form == null) {
      return;
    }
    const fd = new FormData(form);
    const endpoint = String(fd.get("endpoint") ?? "").trim();
    const accessKeyId = String(fd.get("accessKeyId") ?? "").trim();
    const secretAccessKey = String(fd.get("secretAccessKey") ?? "");
    if (endpoint === "" || accessKeyId === "" || secretAccessKey === "") {
      toast.error(
        "Endpoint, access key, and secret are required to discover buckets",
      );
      return;
    }
    const regionRaw = String(fd.get("region") ?? "").trim();
    onDiscoverRequest({
      provider: String(fd.get("provider") ?? "r2"),
      endpoint,
      region: regionRaw === "" ? null : regionRaw,
      accessKeyId,
      secretAccessKey,
    });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>): void {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const values: ConnectionFormValues = {
      label: String(fd.get("label") ?? ""),
      provider: String(fd.get("provider") ?? "r2"),
      endpoint: String(fd.get("endpoint") ?? ""),
      bucket: String(fd.get("bucket") ?? ""),
      region: String(fd.get("region") ?? ""),
      accessKeyId: String(fd.get("accessKeyId") ?? ""),
      secretAccessKey: String(fd.get("secretAccessKey") ?? ""),
    };
    onSubmit(values);
  }

  function handleCancelClick(): void {
    onCancelDraft?.();
  }

  return (
    <form
      className="flex flex-col gap-5 rounded-xl border border-[0.5px] border-zinc-200 bg-white p-6"
      key={draft?.id ?? "new"}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-50">
          <PlusIcon className="h-5 w-5 text-accent-700" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-900">
            {isEdit ? "Edit connection" : "New connection"}
          </p>
          <p className="text-xs text-zinc-400">
            {isEdit ? "Update your connection details" : "Add an S3-compatible bucket"}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Basics
        </label>
        <input
          className={inputClass}
          defaultValue={draft?.label ?? ""}
          name="label"
          placeholder="Connection name"
          type="text"
        />
        <select
          className={inputClass}
          name="presetId"
          onChange={(e) => setPresetId(e.target.value)}
          value={presetId}
        >
          {PROVIDER_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <p className="text-[11px] leading-snug text-zinc-400">
          {preset.description}
          {preset.docsUrl != null && (
            <>
              {" "}
              <a
                className="text-accent-700 underline-offset-2 hover:underline"
                href={preset.docsUrl}
                rel="noreferrer"
                target="_blank"
              >
                Docs
              </a>
            </>
          )}
        </p>
        {/* `provider` is always sent as the canonical id (r2/s3/minio). */}
        <input name="provider" type="hidden" value={preset.provider} />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Connection
        </label>
        {preset.fields.map((f) => (
          <div className="flex flex-col gap-1" key={f.key}>
            <input
              className={inputClass}
              onChange={(e) => handlePresetFieldChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              type="text"
              value={presetValues[f.key] ?? ""}
            />
            {f.helper != null && (
              <p className="text-[11px] text-zinc-400">{f.helper}</p>
            )}
          </div>
        ))}
        <input
          className={inputClass}
          name="endpoint"
          onChange={(e) => {
            setEndpoint(e.target.value);
            setEndpointTouched(true);
          }}
          placeholder="endpoint.example.com"
          title="Auto-filled from your provider preset. Edit only if you need a custom endpoint."
          type="text"
          value={endpoint}
        />
        <div className="flex gap-2">
          <input
            className={inputClass}
            defaultValue={draft?.bucket ?? ""}
            name="bucket"
            placeholder="Bucket name"
            type="text"
          />
          <input
            className={inputClass}
            name="region"
            onChange={(e) => setRegion(e.target.value)}
            placeholder={preset.defaultRegion || "Region (auto)"}
            type="text"
            value={region}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Credentials
        </label>
        <input
          autoComplete="off"
          className={inputClass}
          defaultValue={draft?.accessKeyId ?? ""}
          name="accessKeyId"
          placeholder="Access key ID"
          type="text"
        />
        <input
          className={inputClass}
          name="secretAccessKey"
          placeholder={
            isEdit ? "New secret (optional)" : "Secret access key"
          }
          type="password"
        />
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <div className="flex gap-2">
          {isEdit && onCancelDraft != null && (
            <button
              className="flex-1 rounded-lg bg-zinc-100 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
              disabled={isPending}
              onClick={handleCancelClick}
              type="button"
            >
              Cancel
            </button>
          )}
          <button
            className="min-w-0 flex-1 rounded-lg bg-accent-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-800 active:bg-accent-950 disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving…" : isEdit ? "Save changes" : "Save connection"}
          </button>
        </div>
        {!isEdit && onDiscoverRequest != null && (
          <button
            className="w-full rounded-lg bg-zinc-100 px-4 py-2.5 text-sm text-zinc-600 hover:bg-zinc-200 disabled:opacity-50"
            disabled={isPending}
            onClick={handleDiscoverClick}
            type="button"
          >
            Discover buckets in account…
          </button>
        )}
      </div>
    </form>
  );
}
