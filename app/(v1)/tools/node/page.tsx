import NodeLookup from "./node-lookup";

// Panel tool: every server on a node, with each owner's email resolved, so an
// incident on a node can be turned into a list of affected customers.
export default function NodeLookupPage() {
  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Node lookup</h1>
          <p className="text-xs text-muted">See every server on a node and who owns it</p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-6xl flex-col gap-4">
          <NodeLookup />
        </div>
      </main>
    </>
  );
}
