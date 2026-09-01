import SettingsRail from "./settings-rail";

// The settings shell: the group rail beside whatever page is open. The rail
// hides itself on the overview, which is the hub rather than one of the groups.
//
// The v2 layout above this already scrolls, so this only has to lay the two
// columns out and let the rail run the full height of the page.

export default function V2SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full items-stretch">
      <SettingsRail />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
