import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";

import "./App.css";
import AppShell from "./components/AppShell";
import QuickUploadModal from "./components/QuickUploadModal";
import Dashboard from "./dashboard/Dashboard";
import { useDesktopQuickActions } from "./hooks/useDesktopQuickActions";
import { useStartupUpdateCheck } from "./hooks/useStartupUpdateCheck";
import Settings from "./settings/Settings";

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function XCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function InfoCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
    </svg>
  );
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
    </svg>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1 },
  },
});

export default function App() {
  useDesktopQuickActions();
  useStartupUpdateCheck();

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <QuickUploadModal />
        <Routes>
          <Route element={<AppShell />}>
            <Route element={<Dashboard />} index />
            <Route element={<Settings />} path="settings" />
            <Route element={<Navigate replace to="/" />} path="*" />
          </Route>
        </Routes>
        <Toaster
          icons={{
            success: <CheckCircleIcon className="h-5 w-5 text-green-500" />,
            error: <XCircleIcon className="h-5 w-5 text-red-500" />,
            info: <InfoCircleIcon className="h-5 w-5 text-accent-700" />,
            warning: <WarningIcon className="h-5 w-5 text-amber-500" />,
          }}
          position="bottom-right"
          toastOptions={{
            unstyled: true,
            classNames: {
              toast: "flex items-center gap-3 w-full max-w-xs rounded-xl border border-[0.5px] border-zinc-200 bg-white px-4 py-3 shadow-lg",
              title: "text-sm font-medium text-zinc-900",
              description: "text-xs text-zinc-400 mt-0.5",
              success: "border-green-200 bg-green-50",
              error: "border-red-200 bg-red-50",
              warning: "border-amber-200 bg-amber-50",
              info: "border-accent-200 bg-accent-50",
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
