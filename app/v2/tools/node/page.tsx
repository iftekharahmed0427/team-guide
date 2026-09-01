import NodeLookup from "./node-lookup";

// /v2/tools/node - every server on a node, with each owner's email resolved, so
// an incident on a node can be turned into a list of affected customers.

export default function V2NodeLookupPage() {
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex min-w-0 flex-col gap-[6px]">
        <h1 className="text-[28px] font-bold text-[#e2e8f0]">Node lookup</h1>
        <p className="text-[14px] font-normal text-[#94a3b8]">
          See every server on a node and who owns it
        </p>
      </div>

      <NodeLookup />
    </div>
  );
}
