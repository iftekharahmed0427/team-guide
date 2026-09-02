import ServerLookup from "./server-lookup";

// Panel tool: one game server by its internal (admin) ID, with quick links into
// the panel and the matching WHMCS service. Read-only; the lookup itself runs in
// a server action so the panel key never reaches the browser.
export default function ServerLookupPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Server lookup</h1>
          <p className="text-xs text-muted">Find a game server by its internal panel ID</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-4xl flex-col gap-4">
          <ServerLookup />
        </div>
      </main>
    </>
  );
}
