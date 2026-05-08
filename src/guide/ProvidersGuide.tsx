function CloudIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15a4.5 4.5 0 0 0 4.5 4.5H18a3.75 3.75 0 0 0 1.332-7.257 3 3 0 0 0-3.758-3.848 5.25 5.25 0 0 0-10.233 2.33A4.502 4.502 0 0 0 2.25 15Z" />
    </svg>
  );
}

interface ProviderCard {
  name: string;
  description: string;
  status: "available" | "coming-soon";
}

const PROVIDERS: ProviderCard[] = [
  { name: "Cloudflare R2", description: "Zero egress fees, global edge network", status: "available" },
  { name: "Amazon S3", description: "The original cloud storage", status: "available" },
  { name: "Backblaze B2", description: "Affordable cloud storage", status: "available" },
  { name: "Wasabi", description: "Hot storage, no egress fees", status: "available" },
  { name: "DigitalOcean Spaces", description: "Simple object storage", status: "coming-soon" },
  { name: "Linode Object Storage", description: "S3-compatible storage", status: "coming-soon" },
];

export default function ProvidersGuide() {
  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-lg font-medium text-zinc-900">Cloud Providers</h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500">
              S3-Compatible
            </span>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Vaulty works with any S3-compatible cloud storage provider. Here's an overview of 
            supported providers and how to connect them.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Supported Providers</h2>
          <div className="grid gap-3">
            {PROVIDERS.map((provider) => (
              <div
                className="flex items-center gap-4 rounded-xl border border-[0.5px] border-zinc-200 bg-white p-4"
                key={provider.name}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
                  <CloudIcon className="h-5 w-5 text-zinc-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900">{provider.name}</p>
                  <p className="text-xs text-zinc-400">{provider.description}</p>
                </div>
                {provider.status === "available" ? (
                  <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-medium text-green-600">
                    Available
                  </span>
                ) : (
                  <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[10px] font-medium text-zinc-400">
                    Coming soon
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quick Start</h2>
          <div className="rounded-xl border border-[0.5px] border-zinc-200 bg-zinc-50 p-5">
            <p className="text-sm text-zinc-700 leading-relaxed mb-4">
              To connect a cloud provider, you'll need:
            </p>
            <ol className="space-y-2 text-xs text-zinc-500">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[10px] font-semibold text-accent-700">1</span>
                <span><strong className="text-zinc-700">Access Key ID</strong> — Your API access key</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[10px] font-semibold text-accent-700">2</span>
                <span><strong className="text-zinc-700">Secret Access Key</strong> — Your API secret</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[10px] font-semibold text-accent-700">3</span>
                <span><strong className="text-zinc-700">Bucket name</strong> — The bucket you want to access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-50 text-[10px] font-semibold text-accent-700">4</span>
                <span><strong className="text-zinc-700">Endpoint</strong> — Provider-specific (auto-filled for most)</span>
              </li>
            </ol>
          </div>
        </section>

        <section className="rounded-xl border border-[0.5px] border-accent-200 bg-accent-50 p-5">
          <p className="text-sm font-medium text-accent-700 mb-2">Detailed guides coming soon</p>
          <p className="text-xs text-accent-600 leading-relaxed">
            We're working on step-by-step guides for each provider. In the meantime, go to 
            Settings → Add Connection and select your provider to get started.
          </p>
        </section>
      </div>
    </div>
  );
}
