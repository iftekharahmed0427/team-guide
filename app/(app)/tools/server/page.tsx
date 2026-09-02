import ServerLookup from "./server-lookup";

// /tools/server - one game server by its internal (admin) panel ID, with
// quick links into the panel and the matching WHMCS service.
//
// The lookup runs in the live server action, so the panel key never reaches the
// browser. Read-only: nothing here writes, notifies or logs activity.

export default function ServerLookupPage() {
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex min-w-0 flex-col gap-[6px]">
        <h1 className="text-[28px] font-bold text-[#e2e8f0]">Server lookup</h1>
        <p className="text-[14px] font-normal text-[#94a3b8]">
          Find a game server by its internal panel ID
        </p>
      </div>

      <ServerLookup />
    </div>
  );
}
