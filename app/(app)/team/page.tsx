import { UserPlus, Shield, Trash2, Clock } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { invite as inviteTable } from "@/db/app-schema";
import { inviteMember, setMemberRole, removeMember, revokeInvite } from "./actions";
import CustomSelect from "@/app/components/custom-select";

function getInitials(name?: string | null, email?: string | null) {
  const source = (name ?? "").trim() || (email ?? "").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function RoleBadge({ role }: { role: string | null }) {
  const isAdmin = role === "admin";
  return (
    <span
      className={`inline-flex items-center gap-1 border border-border px-2 py-0.5 text-[11px] font-medium ${
        isAdmin ? "text-foreground" : "text-muted"
      }`}
    >
      {isAdmin ? <Shield size={11} strokeWidth={2} /> : null}
      {isAdmin ? "Admin" : "Member"}
    </span>
  );
}

export default async function TeamPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const currentUserId = session?.user.id;

  const members = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .orderBy(userTable.createdAt);

  const invites = isAdmin
    ? await db.select().from(inviteTable).orderBy(inviteTable.createdAt)
    : [];
  const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));
  const pending = invites.filter((i) => !memberEmails.has(i.email.toLowerCase()));

  return (
    <>
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-6">
        <div>
          <h1 className="text-base font-semibold tracking-tight">Team</h1>
          <p className="text-xs text-muted">
            {members.length} member{members.length === 1 ? "" : "s"}
            {isAdmin ? " · invite, change roles, and remove members" : ""}
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="fx-rise mx-auto flex w-full max-w-4xl flex-col gap-6">
          {isAdmin ? (
            <section className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold tracking-tight">Invite a member</h2>
                <p className="text-xs text-muted">
                  They sign in with Discord using this email and get the role you pick.
                </p>
              </div>
              <form
                action={inviteMember}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center"
              >
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="teammate@email.com"
                  className="h-9 flex-1 border border-border bg-surface-2 px-3 text-sm text-foreground outline-none placeholder:text-muted focus:border-muted"
                />
                <CustomSelect
                  name="role"
                  defaultValue="member"
                  options={[
                    { value: "member", label: "Member" },
                    { value: "admin", label: "Admin" },
                  ]}
                  className="w-full sm:w-40"
                />
                <button
                  type="submit"
                  className="btn-wipe btn-wipe-dark flex h-9 items-center justify-center gap-2 border border-border bg-foreground px-4 text-sm font-medium text-background"
                >
                  <UserPlus size={16} strokeWidth={2} />
                  Send invite
                </button>
              </form>
            </section>
          ) : null}

          <section className="border border-border bg-surface">
            <div className="border-b border-border px-5 py-4">
              <h2 className="text-sm font-semibold tracking-tight">Members</h2>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {members.map((m) => {
                  const isSelf = m.id === currentUserId;
                  const targetRole = m.role === "admin" ? "member" : "admin";
                  return (
                    <tr key={m.id} className="border-b border-border last:border-0">
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center border border-border bg-surface-2 text-xs font-semibold">
                            {getInitials(m.name, m.email)}
                          </div>
                          <div className="leading-tight">
                            <p className="font-medium">
                              {m.name || "Member"}
                              {isSelf ? <span className="text-muted"> (you)</span> : null}
                            </p>
                            <p className="text-xs text-muted">{m.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="py-3 pr-3 text-right text-xs text-muted whitespace-nowrap">
                        {new Date(m.createdAt).toISOString().slice(0, 10)}
                      </td>
                      {isAdmin ? (
                        <td className="py-3 pr-5 pl-3">
                          {!isSelf ? (
                            <div className="flex items-center justify-end gap-2">
                              <form action={setMemberRole}>
                                <input type="hidden" name="userId" value={m.id} />
                                <input type="hidden" name="role" value={targetRole} />
                                <button
                                  type="submit"
                                  className="btn-wipe border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
                                >
                                  {targetRole === "admin" ? "Make admin" : "Make member"}
                                </button>
                              </form>
                              <form action={removeMember}>
                                <input type="hidden" name="userId" value={m.id} />
                                <button
                                  type="submit"
                                  aria-label="Remove member"
                                  className="flex h-7 w-7 items-center justify-center border border-border text-muted transition-colors hover:border-red-500/50 hover:text-red-400"
                                >
                                  <Trash2 size={14} strokeWidth={1.75} />
                                </button>
                              </form>
                            </div>
                          ) : null}
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {isAdmin && pending.length > 0 ? (
            <section className="border border-border bg-surface">
              <div className="border-b border-border px-5 py-4">
                <h2 className="text-sm font-semibold tracking-tight">Pending invites</h2>
                <p className="text-xs text-muted">Invited but not signed in yet.</p>
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {pending.map((inv) => (
                    <tr key={inv.id} className="border-b border-border last:border-0">
                      <td className="py-3 pl-5 pr-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center border border-border bg-surface-2 text-muted">
                            <Clock size={15} strokeWidth={1.75} />
                          </div>
                          <p className="text-foreground">{inv.email}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-3">
                        <RoleBadge role={inv.role} />
                      </td>
                      <td className="py-3 pr-5 pl-3 text-right">
                        <form action={revokeInvite} className="inline">
                          <input type="hidden" name="inviteId" value={inv.id} />
                          <button
                            type="submit"
                            className="btn-wipe border border-border px-2.5 py-1 text-xs text-muted transition-colors hover:text-foreground"
                          >
                            Revoke
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
