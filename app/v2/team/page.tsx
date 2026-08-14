import { ChevronDown, Plus, Trash2 } from "lucide-react";

// /v2/team - the redesign's member roster, built from the "team-members-page"
// Figma frame (node 67:4): the title bar with its active count, the invite card,
// and the members table. Shell comes from app/v2/layout.tsx.
//
// Content is the frame's placeholder copy - this is still the redesign canvas,
// so nothing reads from the user table and every control is inert. The counts
// in the badge and the table header are derived from the rows below so they
// cannot drift apart.

type Member = {
  name: string;
  /** Single letter in the frame, except where the name needs two. */
  initials: string;
  /** Avatar fill - the frame gives each member their own muted hue. */
  tint: string;
  email: string;
  admin: boolean;
  joined: string;
  /** The signed-in member: tagged "(you)" and not actionable. */
  you?: boolean;
};

const MEMBERS: Member[] = [
  {
    name: "Conscience",
    initials: "C",
    tint: "#a78fb0",
    email: "itsmeahmed6427@gmail.com",
    admin: true,
    joined: "2026-08-15",
    you: true,
  },
  {
    name: "Angelina",
    initials: "A",
    tint: "#8fb0a7",
    email: "angelina.312735@gmail.com",
    admin: true,
    joined: "2026-08-15",
  },
  {
    name: "ethan",
    initials: "E",
    tint: "#b08f8f",
    email: "ethansmith771@gmail.com",
    admin: true,
    joined: "2026-08-18",
  },
  {
    name: "Jay",
    initials: "J",
    tint: "#8fa7b0",
    email: "kashiekeepmabm.r@gmail.com",
    admin: true,
    joined: "2026-08-17",
  },
  {
    name: "Trinity™",
    initials: "T",
    tint: "#b0a78f",
    email: "trinitysinch@gmail.com",
    admin: false,
    joined: "2026-08-18",
  },
  {
    name: "OrewSegs",
    initials: "O",
    tint: "#98b08f",
    email: "orewsegs69@gmail.com",
    admin: false,
    joined: "2026-08-18",
  },
  {
    name: "FxMoon",
    initials: "F",
    tint: "#8fb09e",
    email: "danieledulovics08@gmail.com",
    admin: false,
    joined: "2026-08-18",
  },
  {
    name: "Siren Vampy",
    initials: "SV",
    tint: "#afa7af",
    email: "jambertjessica2017@gmail.com",
    admin: false,
    joined: "2026-08-18",
  },
  {
    name: "Petrino",
    initials: "P",
    tint: "#a7b08f",
    email: "petrino.omlaOd@vestrom.co",
    admin: false,
    joined: "2026-08-18",
  },
  {
    name: "iiYoyo",
    initials: "I",
    tint: "#b08fa3",
    email: "yoyo74@gmail.com",
    admin: false,
    joined: "2026-08-18",
  },
  {
    name: "Farah",
    initials: "F",
    tint: "#8fb0a3",
    email: "farahmary13D@gmail.com",
    admin: false,
    joined: "2026-08-07",
  },
];

const COL = { role: "w-[120px]", joined: "w-[160px]", actions: "w-[180px]" };

export default function V2TeamPage() {
  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[24px] p-[32px]">
      <div className="flex items-center justify-between gap-[24px]">
        <div className="flex flex-col gap-[4px]">
          <h1 className="text-[28px] font-bold text-[#e2e8f0]">Team</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Manage and invite team members to your workspace
          </p>
        </div>
        <span className="shrink-0 rounded-[8px] border border-[#243033]! bg-[#171e24] px-[12px] py-[6px] text-[13px] font-semibold text-[#8fb0a7]">
          {MEMBERS.length} members active
        </span>
      </div>

      <div className="flex flex-col gap-[20px] rounded-[12px] border border-[#243033]! bg-[#171e24] p-[24px]">
        <div className="flex flex-col gap-[6px]">
          <p className="text-[16px] font-bold text-[#e2e8f0]">Invite a member</p>
          <p className="text-[13px] font-normal text-[#94a3b8]">
            They sign in with Discord using this email and get the role you pick.
          </p>
        </div>
        <div className="flex items-center gap-[16px]">
          <input
            type="email"
            placeholder="username@email.com"
            className="min-w-0 flex-1 rounded-[8px] border border-[#243033]! bg-[#0f141a] px-[16px] py-[10px] text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb0a7]!"
          />
          {/* Inert while v2 is a canvas; the real control is CustomSelect. */}
          <button
            type="button"
            aria-haspopup="listbox"
            className="flex w-[160px] shrink-0 cursor-pointer items-center justify-between rounded-[8px] border border-[#243033]! bg-[#0f141a] px-[16px] py-[10px] text-[14px] font-medium text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
          >
            Member
            <ChevronDown size={14} strokeWidth={2} className="shrink-0 text-[#64748b]" />
          </button>
          <button
            type="button"
            className="flex shrink-0 cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#8fb0a7]! bg-[#8fb0a7] px-[14px] py-[8px] text-[13px] font-semibold text-[#0f141a] transition-colors hover:bg-[#a3c0b8]"
          >
            <Plus size={14} strokeWidth={2} />
            Send Invite
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#243033]! bg-[#171e24]">
        <div className="flex items-start justify-between gap-[16px] border-b border-[#243033]! px-[24px] pt-[20px] pb-[16px]">
          <p className="text-[16px] font-bold text-[#e2e8f0]">Members</p>
          <p className="text-[13px] font-normal text-[#94a3b8]">
            Showing {MEMBERS.length} accounts
          </p>
        </div>

        <div className="flex items-start border-b border-[#243033]! bg-[#0f141a] px-[24px] py-[12px] text-[11px] font-bold tracking-[0.44px] text-[#64748b] uppercase">
          <p className="min-w-0 flex-1">Member Details</p>
          <p className={COL.role}>Role</p>
          <p className={COL.joined}>Joined Date</p>
          <p className={`text-right ${COL.actions}`}>Actions</p>
        </div>

        {MEMBERS.map((member) => (
          <div
            key={member.email}
            className="flex items-center border-b border-[#243033]! px-[24px] py-[16px]"
          >
            <div className="flex min-w-0 flex-1 items-center gap-[12px]">
              <span
                style={{ backgroundColor: member.tint }}
                className="flex size-[32px] shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-[#0f141a]"
              >
                {member.initials}
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-[2px]">
                <div className="flex items-center gap-[8px]">
                  <p className="truncate text-[14px] font-semibold text-[#e2e8f0]">{member.name}</p>
                  {member.you && (
                    <p className="shrink-0 text-[11px] font-medium text-[#64748b]">(you)</p>
                  )}
                </div>
                <p className="truncate text-[13px] font-normal text-[#94a3b8]">{member.email}</p>
              </div>
            </div>

            <div className={`flex items-center ${COL.role}`}>
              <span
                className={`rounded-[6px] px-[8px] py-[4px] text-[11px] font-bold ${
                  member.admin
                    ? "bg-[#8fb0a7]/[0.11] text-[#8fb0a7]"
                    : "bg-white/[0.03] text-[#94a3b8]"
                }`}
              >
                {member.admin ? "Admin" : "Member"}
              </span>
            </div>

            <div className={`flex items-center text-[13px] font-normal text-[#94a3b8] ${COL.joined}`}>
              {member.joined}
            </div>

            <div className={`flex items-center justify-end gap-[12px] ${COL.actions}`}>
              {member.you ? (
                <p className="text-[12px] font-normal text-[#64748b] italic">Owner</p>
              ) : (
                <>
                  <button
                    type="button"
                    className="cursor-pointer rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]!"
                  >
                    {member.admin ? "Make member" : "Make admin"}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${member.name}`}
                    className="cursor-pointer rounded-[6px] p-[8px] text-[#64748b] transition-colors hover:bg-white/[0.03] hover:text-[#ef4444]"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
