import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import SettingsNav from "./settings-nav";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/");

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-muted">Admin configuration</p>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SettingsNav />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </>
  );
}
