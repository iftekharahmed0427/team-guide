import UserLookup from "./user-lookup";

// Panel tool: find a customer by panel username or email and list every server
// they own, each linked to the panel and to its WHMCS service.
export default function UserLookupPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">User lookup</h1>
          <p className="text-xs text-muted">Find a customer and everything they host with us</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-5xl flex-col gap-4">
          <UserLookup />
        </div>
      </main>
    </>
  );
}
