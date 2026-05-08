import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import type {
  ConnectionConfig,
  CredentialProfile,
  ListBucketsCredentials,
} from "../../types";
import {
  PROVIDER_PRESETS,
  applyPreset,
  detectPreset,
  type PresetField,
} from "../providerPresets";

export interface ConnectionFormValues {
  label: string;
  provider: string;
  endpoint: string;
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  credentialProfileId: string | null;
}

export interface ConnectionFormPrefill {
  endpoint?: string;
  bucket?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  label?: string;
  presetId?: string;
}

interface ConnectionFormProps {
  isPending: boolean;
  onSubmit: (values: ConnectionFormValues) => void;
  draft?: ConnectionConfig | null;
  onCancelDraft?: () => void;
  onDiscoverRequest?: (credentials: ListBucketsCredentials) => void;
  prefill?: ConnectionFormPrefill | null;
  credentialProfiles?: CredentialProfile[];
}

const inputClass =
  "w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-accent-200 focus:outline-none focus:ring-2 focus:ring-accent-200/40";

export default function ConnectionForm({
  isPending,
  onSubmit,
  draft,
  onCancelDraft,
  onDiscoverRequest,
  prefill,
  credentialProfiles = [],
}: ConnectionFormProps) {
  const isEdit = draft != null;
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const useSavedProfile = !isEdit && selectedProfileId !== "";

  // Pick a sensible default preset: when editing, detect from existing
  // endpoint; otherwise detect from prefill endpoint or default to R2.
  const initialPreset =
    (draft != null ? detectPreset(draft.endpoint) : null) ??
    (prefill?.presetId != null ? (PROVIDER_PRESETS.find((p) => p.id === prefill.presetId) ?? null) : null) ??
    (prefill?.endpoint != null ? detectPreset(prefill.endpoint) : null) ??
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
  const [endpoint, setEndpoint] = useState<string>(
    draft?.endpoint ?? prefill?.endpoint ?? "",
  );
  const [endpointTouched, setEndpointTouched] = useState<boolean>(
    draft != null || prefill?.endpoint != null,
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
      credentialProfileId: useSavedProfile ? selectedProfileId : null,
    };
    onSubmit(values);
  }

  function handleCancelClick(): void {
    onCancelDraft?.();
  }

  return (
    <form
      className="flex flex-col gap-4"
      key={draft?.id ?? "new"}
      onSubmit={handleSubmit}
      ref={formRef}
    >
      {!isEdit && credentialProfiles.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Storage Account
          </label>
          <select
            className={inputClass}
            onChange={(e) => setSelectedProfileId(e.target.value)}
            value={selectedProfileId}
          >
            <option value="">New storage account</option>
            {credentialProfiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {!useSavedProfile && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Provider
          </label>
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
          <input name="provider" type="hidden" value={preset.provider} />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
          Name
        </label>
        <input
          className={inputClass}
          defaultValue={draft?.label ?? prefill?.label ?? ""}
          name="label"
          placeholder="My connection"
          type="text"
        />
      </div>

      {!useSavedProfile && preset.fields.length > 0 && (
        <div className="space-y-1.5">
          {preset.fields.map((f) => (
            <div key={f.key}>
              <input
                className={inputClass}
                onChange={(e) => handlePresetFieldChange(f.key, e.target.value)}
                placeholder={f.placeholder}
                type="text"
                value={presetValues[f.key] ?? ""}
              />
              {f.helper != null && (
                <p className="mt-1 text-[10px] text-zinc-400">{f.helper}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {!useSavedProfile && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Endpoint
          </label>
          <input
            className={inputClass}
            name="endpoint"
            onChange={(e) => {
              setEndpoint(e.target.value);
              setEndpointTouched(true);
            }}
            placeholder="endpoint.example.com"
            type="text"
            value={endpoint}
          />
        </div>
      )}

      <div className={useSavedProfile ? "grid gap-2" : "grid grid-cols-2 gap-2"}>
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
            Bucket
          </label>
          <input
            className={inputClass}
            defaultValue={draft?.bucket ?? prefill?.bucket ?? ""}
            name="bucket"
            placeholder="my-bucket"
            type="text"
          />
        </div>
        {!useSavedProfile && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Region
            </label>
            <input
              className={inputClass}
              name="region"
              onChange={(e) => setRegion(e.target.value)}
              placeholder={preset.defaultRegion || "auto"}
              type="text"
              value={region}
            />
          </div>
        )}
      </div>

      {!useSavedProfile && (
        <>
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Access Key
            </label>
            <input
              autoComplete="off"
              className={inputClass}
              defaultValue={draft?.accessKeyId ?? prefill?.accessKeyId ?? ""}
              name="accessKeyId"
              placeholder="AKIAIOSFODNN7EXAMPLE"
              type="text"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              Secret Key
            </label>
            <input
              className={inputClass}
              defaultValue={prefill?.secretAccessKey ?? ""}
              name="secretAccessKey"
              placeholder={
                isEdit ? "Leave blank to keep current" : "••••••••••••••••"
              }
              type="password"
            />
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 pt-2">
        {!isEdit && !useSavedProfile && onDiscoverRequest != null && (
          <button
            className="w-full rounded-md border border-[0.5px] border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            disabled={isPending}
            onClick={handleDiscoverClick}
            type="button"
          >
            Discover buckets…
          </button>
        )}
        <div className="flex gap-2">
          {isEdit && onCancelDraft != null && (
            <button
              className="flex-1 rounded-md bg-white border border-[0.5px] border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
              disabled={isPending}
              onClick={handleCancelClick}
              type="button"
            >
              Cancel
            </button>
          )}
          <button
            className="min-w-0 flex-1 rounded-md bg-accent-700 px-3 py-2 text-xs font-medium text-white hover:bg-accent-800 active:bg-accent-950 disabled:opacity-50"
            disabled={isPending}
            type="submit"
          >
            {isPending ? "Saving…" : isEdit ? "Save" : "Add Connection"}
          </button>
        </div>
      </div>
    </form>
  );
}
