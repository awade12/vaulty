import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </svg>
  );
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m6.75 7.5 3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0 0 21 18V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v12a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function BucketIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 0 1 21.75 8.25Z" />
    </svg>
  );
}

function LinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  }

  return (
    <button
      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <CheckIcon className="h-3 w-3 text-green-400" />
      ) : (
        <CopyIcon className="h-3 w-3" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-xl border border-[0.5px] border-zinc-800 bg-zinc-900">
      {label && (
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
          <span className="text-[11px] font-medium text-zinc-500">{label}</span>
          <CopyButton text={code} />
        </div>
      )}
      <div className="flex items-start justify-between gap-4 px-4 py-3">
        <pre className="min-w-0 flex-1 overflow-x-auto font-mono text-[12px] leading-relaxed text-zinc-200 whitespace-pre-wrap break-all">
          {code}
        </pre>
        {!label && <CopyButton text={code} />}
      </div>
    </div>
  );
}

function StepBadge({ n, done }: { n: number; done?: boolean }) {
  return (
    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
      done ? "bg-green-100 text-green-700" : "bg-accent-50 text-accent-700"
    }`}>
      {done ? <CheckIcon className="h-3.5 w-3.5" /> : n}
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-[0.5px] border-accent-200 bg-accent-50 px-4 py-3 text-xs text-accent-700 leading-relaxed">
      {children}
    </div>
  );
}

function Field({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
        <p className={`truncate text-sm text-zinc-900 ${mono ? "font-mono" : ""}`}>{value}</p>
      </div>
      <button
        className="shrink-0 rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700"
        onClick={handleCopy}
        type="button"
      >
        {copied ? <CheckIcon className="h-3.5 w-3.5 text-green-500" /> : <CopyIcon className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

const INSTALL_CMD = `curl -fsSL https://raw.githubusercontent.com/awade12/vaulty/main/scripts/install-minio.sh | bash`;

const MC_INSTALL = `# macOS
brew install minio/stable/mc

# Linux
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc && sudo mv mc /usr/local/bin/`;

const MC_ALIAS = `mc alias set local http://localhost:9000 minioadmin minioadmin`;
const MC_BUCKET = `mc mb local/my-bucket`;
const MC_LIST = `mc ls local`;

export default function MinIOGuide() {
  const navigate = useNavigate();
  const [minioHost, setMinioHost] = useState("localhost");
  const [minioPort, setMinioPort] = useState("9000");
  const [accessKey, setAccessKey] = useState("minioadmin");
  const [secretKey, setSecretKey] = useState("minioadmin");
  const [bucketName, setBucketName] = useState("");

  const endpoint = `http://${minioHost}:${minioPort}`;
  const endpointForForm = `${minioHost}:${minioPort}`;

  function handleConnectInVaulty() {
    const params = new URLSearchParams({
      prefill: "minio",
      presetId: "minio",
      endpoint: endpointForForm,
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
      bucket: bucketName,
    });
    navigate(`/settings?${params.toString()}`);
  }

  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-2xl space-y-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-lg font-medium text-zinc-900">MinIO Setup</h1>
            <span className="rounded-full bg-zinc-100 px-2.5 py-0.5 text-[10px] font-medium text-zinc-500">
              Self-hosted S3
            </span>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            MinIO gives you S3-compatible object storage you can run on your own VPS or server.
            Follow these steps to install MinIO, create buckets, and connect it to Vaulty.
          </p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge n={1} />
            <div className="flex items-center gap-2">
              <TerminalIcon className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Install MinIO with Docker</h2>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pl-10">
            Run this one-liner on your VPS or local machine. It installs Docker if needed, then starts
            MinIO with persistent storage and auto-restart enabled.
          </p>
          <div className="pl-10">
            <CodeBlock code={INSTALL_CMD} label="Terminal" />
          </div>
          <div className="pl-10">
            <InfoBox>
              By default MinIO uses port <strong>9000</strong> for the S3 API and <strong>9001</strong> for
              the web console. Credentials default to <code className="font-mono">minioadmin</code> /&nbsp;
              <code className="font-mono">minioadmin</code> — change them by prefixing the command with
              env vars: <code className="font-mono">MINIO_ROOT_USER=you MINIO_ROOT_PASSWORD=strongpass</code>
            </InfoBox>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge n={2} />
            <div className="flex items-center gap-2">
              <ExternalLinkIcon className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Open the MinIO console</h2>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pl-10">
            Once the install script finishes, open the web console to verify MinIO is running.
          </p>
          <div className="pl-10 space-y-2">
            <Field label="Console URL" value="http://localhost:9001" mono />
            <Field label="Default username" value="minioadmin" mono />
            <Field label="Default password" value="minioadmin" mono />
          </div>
          <p className="text-xs text-zinc-400 pl-10">
            Log in and you'll see the MinIO dashboard. If the page doesn't load, check that Docker is
            running: <code className="font-mono text-zinc-600">docker ps | grep vaulty-minio</code>
          </p>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge n={3} />
            <div className="flex items-center gap-2">
              <BucketIcon className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Create a bucket</h2>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pl-10">
            You can create buckets from the console UI or the MinIO CLI (<code className="font-mono">mc</code>).
          </p>

          <div className="pl-10 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Option A — Console UI</p>
            <ol className="space-y-1.5 text-xs text-zinc-500">
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">1.</span> Go to <strong>Buckets</strong> in the left sidebar</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">2.</span> Click <strong>Create Bucket</strong> (top right)</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">3.</span> Enter a bucket name (lowercase letters, numbers, hyphens only)</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">4.</span> Click <strong>Create Bucket</strong> — done</li>
            </ol>

            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 pt-2">Option B — CLI (<code className="font-mono normal-case">mc</code>)</p>
            <div className="space-y-3">
              <CodeBlock code={MC_INSTALL} label="Install mc" />
              <CodeBlock code={MC_ALIAS} label="Add your MinIO server" />
              <CodeBlock code={MC_BUCKET} label="Create a bucket" />
              <CodeBlock code={MC_LIST} label="List all buckets" />
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge n={4} />
            <div className="flex items-center gap-2">
              <KeyIcon className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Get your API credentials</h2>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pl-10">
            To connect Vaulty, you need an Access Key and Secret Key. You can use the root credentials
            or create a dedicated access key in the console (recommended for production).
          </p>
          <div className="pl-10 space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Create a dedicated access key (recommended)</p>
            <ol className="space-y-1.5 text-xs text-zinc-500">
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">1.</span> In the console, go to <strong>Access Keys</strong> in the left sidebar</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">2.</span> Click <strong>Create Access Key</strong></li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">3.</span> Copy both the Access Key and Secret Key — the secret is only shown once</li>
              <li className="flex items-start gap-2"><span className="mt-0.5 shrink-0 font-medium text-zinc-700">4.</span> Optionally set a policy to restrict access to specific buckets</li>
            </ol>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <StepBadge n={5} />
            <div className="flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Connect to Vaulty</h2>
            </div>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed pl-10">
            Fill in your MinIO details below and click <strong>Open in Settings</strong> to jump straight
            to the connection form with everything pre-filled.
          </p>

          <div className="pl-10 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">MinIO Host</label>
                <input
                  className="w-full rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                  onChange={(e) => setMinioHost(e.target.value)}
                  placeholder="localhost or your VPS IP"
                  type="text"
                  value={minioHost}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">API Port</label>
                <input
                  className="w-full rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                  onChange={(e) => setMinioPort(e.target.value)}
                  placeholder="9000"
                  type="text"
                  value={minioPort}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Access Key</label>
                <input
                  className="w-full rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                  onChange={(e) => setAccessKey(e.target.value)}
                  placeholder="minioadmin"
                  type="text"
                  value={accessKey}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">Secret Key</label>
                <input
                  className="w-full rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="minioadmin"
                  type="password"
                  value={secretKey}
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700">Bucket Name <span className="font-normal text-zinc-400">(optional — fill in after creating one)</span></label>
              <input
                className="w-full rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-accent-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-accent-200/40"
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="my-bucket"
                type="text"
                value={bucketName}
              />
            </div>

            <div className="rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-4 py-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Connection preview</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs text-zinc-600">
                <span className="text-zinc-400">Endpoint</span>
                <span className="truncate">{endpoint}</span>
                <span className="text-zinc-400">Access Key</span>
                <span className="truncate">{accessKey || "—"}</span>
                <span className="text-zinc-400">Region</span>
                <span>us-east-1</span>
                <span className="text-zinc-400">Bucket</span>
                <span className="truncate">{bucketName || "—"}</span>
              </div>
            </div>

            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-800 disabled:opacity-50"
              disabled={!accessKey || !secretKey}
              onClick={handleConnectInVaulty}
              type="button"
            >
              <LinkIcon className="h-4 w-4" />
              Open in Settings
            </button>
            <p className="text-center text-[11px] text-zinc-400">
              This takes you to the connection form with your details pre-filled.
            </p>
          </div>
        </section>

        <section className="space-y-4 border-t border-[0.5px] border-zinc-100 pt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Quick reference</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "S3 API endpoint", value: "http://localhost:9000", mono: true },
              { label: "Web console", value: "http://localhost:9001", mono: true },
              { label: "Container name", value: "vaulty-minio", mono: true },
              { label: "Region (MinIO)", value: "us-east-1", mono: true },
            ].map((f) => (
              <Field key={f.label} label={f.label} mono={f.mono} value={f.value} />
            ))}
          </div>
          <div className="rounded-lg border border-[0.5px] border-zinc-200 bg-zinc-50 px-4 py-3 space-y-2 text-xs text-zinc-500">
            <p className="font-medium text-zinc-700">Useful Docker commands</p>
            <div className="space-y-1 font-mono text-[11px]">
              <p><span className="text-zinc-400">Start: </span>docker start vaulty-minio</p>
              <p><span className="text-zinc-400">Stop: </span>docker stop vaulty-minio</p>
              <p><span className="text-zinc-400">Logs: </span>docker logs -f vaulty-minio</p>
              <p><span className="text-zinc-400">Remove: </span>docker rm -f vaulty-minio</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
