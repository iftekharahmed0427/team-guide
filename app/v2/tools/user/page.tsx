import UserLookup from "./user-lookup";

// /v2/tools/user - find a customer by panel username or email and list every
// server they own, each linked to the panel and to its WHMCS service.

export default function V2UserLookupPage() {
  return (
    <div className="flex flex-col gap-[28px] p-[32px]">
      <div className="flex min-w-0 flex-col gap-[6px]">
        <h1 className="text-[28px] font-bold text-[#e2e8f0]">User lookup</h1>
        <p className="text-[14px] font-normal text-[#94a3b8]">
          Find a customer and everything they host with us
        </p>
      </div>

      <UserLookup />
    </div>
  );
}
