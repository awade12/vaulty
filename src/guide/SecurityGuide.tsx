function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
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

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
    </svg>
  );
}

function ServerIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 17.25v-.228a4.5 4.5 0 0 0-.12-1.03l-2.268-9.64a3.375 3.375 0 0 0-3.285-2.602H7.923a3.375 3.375 0 0 0-3.285 2.602l-2.268 9.64a4.5 4.5 0 0 0-.12 1.03v.228m19.5 0a3 3 0 0 1-3 3H5.25a3 3 0 0 1-3-3m19.5 0a3 3 0 0 0-3-3H5.25a3 3 0 0 0-3 3m16.5 0h.008v.008h-.008v-.008Zm-3 0h.008v.008h-.008v-.008Z" />
    </svg>
  );
}

function EyeSlashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

interface SecurityFeature {
  icon: typeof ShieldIcon;
  title: string;
  description: string;
}

const SECURITY_FEATURES: SecurityFeature[] = [
  {
    icon: LockIcon,
    title: "OS Keychain Storage",
    description: "Your secret keys are stored in your operating system's secure keychain — macOS Keychain, Windows Credential Manager, or Linux Secret Service. Never in plain text files.",
  },
  {
    icon: EyeSlashIcon,
    title: "Secrets Never Logged",
    description: "Secret access keys are never written to logs, config files, or crash reports. They're only held in memory when actively making API calls.",
  },
  {
    icon: ServerIcon,
    title: "Direct Connection",
    description: "Vaulty connects directly to your storage provider. Your credentials and files never pass through our servers — there are no Vaulty servers.",
  },
  {
    icon: KeyIcon,
    title: "Reusable Storage Accounts",
    description: "A storage account's secret is stored once in the keychain and reused by every bucket connection that points to that account. Removing the last bucket for an account removes its secret.",
  },
];

export default function SecurityGuide() {
  return (
    <div className="px-8 py-8">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-lg font-medium text-zinc-900">Security</h1>
            <span className="rounded-full bg-green-50 px-2.5 py-0.5 text-[10px] font-medium text-green-600">
              Your keys are safe
            </span>
          </div>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Vaulty takes security seriously. Your API credentials are stored using your operating 
            system's native secure storage — the same system that protects your passwords and 
            certificates.
          </p>
        </div>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">How we protect your credentials</h2>
          <div className="grid gap-4">
            {SECURITY_FEATURES.map((feature) => (
              <div
                className="flex gap-4 rounded-xl border border-[0.5px] border-zinc-200 bg-white p-4"
                key={feature.title}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-50">
                  <feature.icon className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 mb-1">{feature.title}</p>
                  <p className="text-xs text-zinc-500 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Technical details</h2>
          <div className="rounded-xl border border-[0.5px] border-zinc-200 bg-zinc-50 p-5 space-y-4">
            <div>
              <p className="text-sm font-medium text-zinc-700 mb-2">Keychain integration</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Vaulty uses the <code className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[11px] text-zinc-700">keyring</code> library 
                to interface with your OS's secure credential storage:
              </p>
              <ul className="mt-3 space-y-2 text-xs text-zinc-500">
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                  <span><strong className="text-zinc-700">macOS:</strong> Keychain Services (same as Safari, 1Password)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                  <span><strong className="text-zinc-700">Windows:</strong> Windows Credential Manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircleIcon className="h-4 w-4 shrink-0 text-green-500 mt-0.5" />
                  <span><strong className="text-zinc-700">Linux:</strong> Secret Service API (GNOME Keyring, KWallet)</span>
                </li>
              </ul>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-zinc-700 mb-2">What's stored where</p>
              <div className="rounded-lg border border-[0.5px] border-zinc-200 bg-white overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Data</th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Location</th>
                      <th className="px-3 py-2 text-left font-medium text-zinc-500">Encrypted</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    <tr>
                      <td className="px-3 py-2 text-zinc-700">Secret Access Key</td>
                      <td className="px-3 py-2 text-zinc-500 font-mono">OS Keychain</td>
                      <td className="px-3 py-2"><span className="rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">Yes</span></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-zinc-700">Storage account profile</td>
                      <td className="px-3 py-2 text-zinc-500 font-mono">App config</td>
                      <td className="px-3 py-2"><span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">No</span></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-zinc-700">Access Key ID</td>
                      <td className="px-3 py-2 text-zinc-500 font-mono">App config</td>
                      <td className="px-3 py-2"><span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">No*</span></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-zinc-700">Bucket name</td>
                      <td className="px-3 py-2 text-zinc-500 font-mono">App config</td>
                      <td className="px-3 py-2"><span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">No</span></td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 text-zinc-700">Endpoint URL</td>
                      <td className="px-3 py-2 text-zinc-500 font-mono">App config</td>
                      <td className="px-3 py-2"><span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500">No</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-zinc-400">
                * Storage account profiles contain non-secret routing metadata like provider, endpoint, region, and access key ID. Access Key IDs are like usernames, not passwords.
              </p>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-zinc-700 mb-2">How bucket connections share credentials</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Vaulty separates storage accounts from bucket connections. You can save one storage account, discover or add hundreds of buckets, and each bucket points back to the same keychain-backed credential profile instead of storing duplicate secrets.
              </p>
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
                When you rotate a storage account secret, Vaulty tests the new secret against every attached bucket before replacing the old keychain value.
              </p>
            </div>

            <div className="border-t border-zinc-200 pt-4">
              <p className="text-sm font-medium text-zinc-700 mb-2">Destructive action safety</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Bulk and folder deletes show a dry-run preview before the delete runs. The preview includes object count, sample keys, total size when available, and a warning if the scan hit its cap.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Best practices</h2>
          <div className="rounded-xl border border-[0.5px] border-accent-200 bg-accent-50 p-5 space-y-3">
            <p className="text-sm font-medium text-accent-700">Recommendations for production use</p>
            <ul className="space-y-2 text-xs text-accent-600">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-200 text-[9px] font-semibold text-accent-700">1</span>
                <span>Create dedicated access keys for Vaulty instead of using root credentials</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-200 text-[9px] font-semibold text-accent-700">2</span>
                <span>Use IAM policies to restrict keys to only the buckets they need</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-200 text-[9px] font-semibold text-accent-700">3</span>
                <span>Rotate your access keys periodically (every 90 days is a good baseline)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-accent-200 text-[9px] font-semibold text-accent-700">4</span>
                <span>Enable bucket versioning to protect against accidental deletions</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="rounded-xl border border-[0.5px] border-zinc-200 bg-white p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100">
              <ShieldIcon className="h-5 w-5 text-zinc-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-900 mb-1">Open source</p>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Vaulty is open source. You can audit the credential handling code yourself on GitHub. 
                The keychain integration lives in <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">src-tauri/src/storage/credentials.rs</code>, and reusable account metadata lives in <code className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[11px] text-zinc-600">src-tauri/src/storage/credential_profiles.rs</code>.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
