// Provider presets used by the connection form to pre-fill endpoint/region
// patterns so users don't have to remember each provider's URL format.
//
// `endpointTemplate` may contain `{account}`, `{region}`, or `{custom}`
// placeholders. When the user picks a preset we render the placeholder fields
// so they only fill in what's unique to their account.

export type PresetField = "account" | "region" | "custom";

export interface ProviderPreset {
  id: string;
  // Stored as `provider` on the connection. Keep stable — used by Rust.
  provider: "r2" | "s3" | "minio";
  label: string;
  description: string;
  // Free-form template for the endpoint URL (without protocol).
  endpointTemplate: string;
  defaultRegion: string;
  fields: Array<{
    key: PresetField;
    label: string;
    placeholder: string;
    helper?: string;
  }>;
  docsUrl?: string;
}

export const PROVIDER_PRESETS: ProviderPreset[] = [
  {
    id: "r2",
    provider: "r2",
    label: "Cloudflare R2",
    description: "Cloudflare's S3-compatible object storage.",
    endpointTemplate: "{account}.r2.cloudflarestorage.com",
    defaultRegion: "auto",
    fields: [
      {
        key: "account",
        label: "Account ID",
        placeholder: "abc123def456",
        helper: "Found in your Cloudflare dashboard under R2.",
      },
    ],
    docsUrl: "https://developers.cloudflare.com/r2/api/s3/tokens/",
  },
  {
    id: "aws-s3",
    provider: "s3",
    label: "Amazon S3",
    description: "AWS's classic object storage.",
    endpointTemplate: "s3.{region}.amazonaws.com",
    defaultRegion: "us-east-1",
    fields: [
      {
        key: "region",
        label: "Region",
        placeholder: "us-east-1",
        helper: "e.g. us-east-1, eu-west-1, ap-southeast-2.",
      },
    ],
    docsUrl: "https://docs.aws.amazon.com/general/latest/gr/s3.html",
  },
  {
    id: "backblaze-b2",
    provider: "s3",
    label: "Backblaze B2",
    description: "Backblaze B2 via the S3-compatible endpoint.",
    endpointTemplate: "s3.{region}.backblazeb2.com",
    defaultRegion: "us-west-002",
    fields: [
      {
        key: "region",
        label: "Region",
        placeholder: "us-west-002",
        helper: "Visible on your B2 bucket detail page (e.g. us-west-002).",
      },
    ],
    docsUrl: "https://www.backblaze.com/docs/cloud-storage-s3-compatible-api",
  },
  {
    id: "wasabi",
    provider: "s3",
    label: "Wasabi",
    description: "Wasabi Hot Cloud Storage.",
    endpointTemplate: "s3.{region}.wasabisys.com",
    defaultRegion: "us-east-1",
    fields: [
      {
        key: "region",
        label: "Region",
        placeholder: "us-east-1",
        helper: "e.g. us-east-1, eu-central-1, ap-northeast-1.",
      },
    ],
    docsUrl: "https://docs.wasabi.com/v1/docs/what-are-the-service-urls-for-wasabis-different-storage-regions",
  },
  {
    id: "digitalocean-spaces",
    provider: "s3",
    label: "DigitalOcean Spaces",
    description: "DigitalOcean's S3-compatible object storage.",
    endpointTemplate: "{region}.digitaloceanspaces.com",
    defaultRegion: "nyc3",
    fields: [
      {
        key: "region",
        label: "Region",
        placeholder: "nyc3",
        helper: "e.g. nyc3, sfo3, ams3, fra1, sgp1.",
      },
    ],
    docsUrl: "https://docs.digitalocean.com/products/spaces/",
  },
  {
    id: "linode-objects",
    provider: "s3",
    label: "Linode / Akamai Object Storage",
    description: "Akamai (formerly Linode) object storage.",
    endpointTemplate: "{region}.linodeobjects.com",
    defaultRegion: "us-east-1",
    fields: [
      {
        key: "region",
        label: "Region",
        placeholder: "us-east-1",
        helper: "e.g. us-east-1, eu-central-1, ap-south-1.",
      },
    ],
  },
  {
    id: "minio",
    provider: "minio",
    label: "MinIO (self-hosted)",
    description: "Your own MinIO instance.",
    endpointTemplate: "{custom}",
    defaultRegion: "",
    fields: [
      {
        key: "custom",
        label: "Endpoint host",
        placeholder: "minio.example.com:9000",
        helper: "Hostname (and port) without the http(s):// prefix.",
      },
    ],
  },
  {
    id: "custom",
    provider: "s3",
    label: "Custom S3-compatible",
    description: "Any other S3 API (Tigris, Storj, IDrive, etc).",
    endpointTemplate: "{custom}",
    defaultRegion: "auto",
    fields: [
      {
        key: "custom",
        label: "Endpoint host",
        placeholder: "s3.my-provider.com",
        helper: "Hostname only — no protocol, no path.",
      },
    ],
  },
];

export function applyPreset(
  preset: ProviderPreset,
  values: Partial<Record<PresetField, string>>,
): { endpoint: string; region: string; provider: string } {
  let endpoint = preset.endpointTemplate;
  for (const f of preset.fields) {
    const v = (values[f.key] ?? "").trim();
    endpoint = endpoint.replace(`{${f.key}}`, v);
  }
  // For custom/minio with `{custom}` left untouched, fall back to empty.
  endpoint = endpoint.replace(/\{[a-z]+\}/g, "");
  const region = (values.region ?? preset.defaultRegion).trim();
  return { endpoint, region, provider: preset.provider };
}

export function detectPreset(endpoint: string): ProviderPreset | null {
  const ep = endpoint.toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  if (ep.endsWith(".r2.cloudflarestorage.com")) return PROVIDER_PRESETS.find((p) => p.id === "r2") ?? null;
  if (ep.endsWith(".amazonaws.com")) return PROVIDER_PRESETS.find((p) => p.id === "aws-s3") ?? null;
  if (ep.endsWith(".backblazeb2.com")) return PROVIDER_PRESETS.find((p) => p.id === "backblaze-b2") ?? null;
  if (ep.endsWith(".wasabisys.com")) return PROVIDER_PRESETS.find((p) => p.id === "wasabi") ?? null;
  if (ep.endsWith(".digitaloceanspaces.com")) return PROVIDER_PRESETS.find((p) => p.id === "digitalocean-spaces") ?? null;
  if (ep.endsWith(".linodeobjects.com")) return PROVIDER_PRESETS.find((p) => p.id === "linode-objects") ?? null;
  return null;
}
