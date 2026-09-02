import { asc } from "drizzle-orm";
import { Clock, Shield } from "lucide-react";
import { getSession } from "@/lib/auth";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { invite as inviteTable } from "@/db/app-schema";
import { formatDate } from "@/lib/datetime";
import { initialsOf, plainName, tintFor } from "../member";
import { InviteMember, MemberRow, RevokeInvite } from "./team-controls";

// /team - the member roster, built from the "team-members-page" Figma frame
// (node 67:4): the title bar with its active count, the invite card, and the
// members table. Shell comes from app/layout.tsx.
//
// Reads the real user table. Inviting, changing a role and removing someone are
// admin-only, both here and in the actions themselves; a member sees the roster
// and nothing else, which is what the live page does.
//
// The frame draws no pending-invite list. One is added below the table, because
// an invite that nobody has accepted is otherwise invisible and there would be
// no way to revoke it.

const COL = { role: "w-[120px]", joined: "w-[160px]", actions: "w-[200px]" };

export default async function TeamPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const currentUserId = session?.user.id ?? "";

  const members = await db
    .select({
      id: userTable.id,
      name: userTable.name,
      email: userTable.email,
      role: userTable.role,
      createdAt: userTable.createdAt,
    })
    .from(userTable)
    .orderBy(asc(userTable.createdAt));

  // Invites only matter to an admin, and only until they are accepted: an
  // address that already belongs to a member is a spent invite, not a pending
  // one, which is the same rule the live page applies.
  const invites = isAdmin
    ? await db.select().from(inviteTable).orderBy(asc(inviteTable.createdAt))
    : [];
  const memberEmails = new Set(members.map((m) => m.email.toLowerCase()));
  const pending = invites.filter(
    (i) => !memberEmails.has(i.email.toLowerCase()),
  );

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Team</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            {isAdmin
              ? "Manage and invite team members to your workspace"
              : "Everyone with access to the workspace"}
          </p>
        </div>
        <span className="shrink-0 rounded-[8px] border border-[#243033]! bg-[#171e24] px-[12px] py-[6px] text-[13px] font-semibold text-[#8fb0a7]">
          {members.length} member{members.length === 1 ? "" : "s"} active
        </span>
      </div>

      {isAdmin ? (
        <div className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
          <div className="flex flex-col gap-[6px]">
            <p className="text-[16px] font-bold text-[#e2e8f0]">
              Invite a member
            </p>
            <p className="text-[13px] font-normal text-[#94a3b8]">
              They sign in with Discord using this email and get the role you
              pick.
            </p>
          </div>
          <InviteMember />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24]">
        <div className="flex items-start justify-between gap-[16px] border-b border-[#243033]! px-[24px] pt-[20px] pb-[16px]">
          <p className="text-[16px] font-bold text-[#e2e8f0]">Members</p>
          <p className="text-[13px] font-normal text-[#94a3b8]">
            Showing {members.length} account{members.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex items-start border-b border-[#243033]! bg-[#0f141a] px-[24px] py-[12px] text-[11px] font-bold tracking-[0.44px] text-[#64748b] uppercase">
          <p className="min-w-0 flex-1">Member Details</p>
          <p className={COL.role}>Role</p>
          <p className={COL.joined}>Joined Date</p>
          {isAdmin ? (
            <p className={`text-right ${COL.actions}`}>Actions</p>
          ) : null}
        </div>

        {members.map((raw) => {
          const name = plainName(raw.name || raw.email || "Member");
          const admin = raw.role === "admin";
          const you = raw.id === currentUserId;

          return (
            <div
              key={raw.id}
              className="flex items-center border-b border-[#243033]! px-[24px] py-[16px] last:border-0"
            >
              <div className="flex min-w-0 flex-1 items-center gap-[12px]">
                <span
                  style={{ backgroundColor: tintFor(name) }}
                  className="flex size-[32px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#0f141a]"
                >
                  {initialsOf(name)}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                  <div className="flex items-center gap-[8px]">
                    <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">
                      {name}
                    </p>
                    {you ? (
                      <p className="shrink-0 text-[11px] font-medium text-[#64748b]">
                        (you)
                      </p>
                    ) : null}
                  </div>
                  <p className="truncate text-[13px] font-normal text-[#94a3b8]">
                    {raw.email}
                  </p>
                </div>
              </div>

              <div className={`flex items-center ${COL.role}`}>
                <span
                  className={`flex items-center gap-[4px] rounded-[6px] px-[8px] py-[4px] text-[11px] font-bold ${
                    admin
                      ? "bg-[#8fb0a7]/[0.11] text-[#8fb0a7]"
                      : "bg-white/[0.03] text-[#94a3b8]"
                  }`}
                >
                  {admin ? <Shield size={10} strokeWidth={2.5} /> : null}
                  {admin ? "Admin" : "Member"}
                </span>
              </div>

              <div
                className={`flex items-center text-[13px] font-normal text-[#94a3b8] ${COL.joined}`}
              >
                {formatDate(raw.createdAt)}
              </div>

              {isAdmin ? (
                <div
                  className={`flex items-center justify-end gap-[12px] ${COL.actions}`}
                >
                  {you ? (
                    // The action refuses this anyway; not offering it is clearer
                    // than letting an admin lock themselves out mid-click.
                    <p className="text-[12px] font-normal text-[#64748b] italic">
                      You
                    </p>
                  ) : (
                    <MemberRow userId={raw.id} name={name} isAdmin={admin} />
                  )}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {isAdmin && pending.length > 0 ? (
        <div className="overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24]">
          <div className="flex items-center gap-[8px] border-b border-[#243033]! px-[24px] pt-[20px] pb-[16px]">
            <Clock size={14} strokeWidth={2} className="text-[#94a3b8]" />
            <p className="text-[16px] font-bold text-[#e2e8f0]">
              Pending invites
            </p>
            <p className="text-[13px] font-normal text-[#94a3b8]">
              {pending.length} not accepted yet
            </p>
          </div>

          {pending.map((invite) => (
            <div
              key={invite.id}
              className="flex items-center justify-between gap-[16px] border-b border-[#243033]! px-[24px] py-[14px] last:border-0"
            >
              <div className="flex min-w-0 flex-col gap-[2px]">
                <p className="truncate text-[14px] font-medium text-[#e2e8f0]">
                  {invite.email}
                </p>
                <p className="text-[12px] font-normal text-[#64748b]">
                  Invited as {invite.role === "admin" ? "admin" : "member"}
                  {invite.invitedBy ? ` by ${invite.invitedBy}` : ""}
                </p>
              </div>
              <RevokeInvite inviteId={invite.id} email={invite.email} />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
