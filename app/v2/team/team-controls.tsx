"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Loader2, Plus, Trash2, X } from "lucide-react";
import {
  inviteMember,
  removeMember,
  revokeInvite,
  setMemberRole,
} from "@/lib/actions/team";
import V2ConfirmDialog from "../confirm-dialog";
import V2Select from "../custom-select";

// The write half of the Team page: the invite card, the role toggle on a row,
// the remove button, and revoking a pending invite.
//
// Every action is the live one, and each takes a FormData because they are form
// actions on the old page. None returns a result: they throw or they succeed,
// so the failures surface here as a caught message.

const ROLES = [
  { value: "member", label: "Member" },
  { value: "admin", label: "Admin" },
];

function useAdminAction() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function run(build: () => FormData, act: (data: FormData) => Promise<void>) {
    setError("");
    startTransition(async () => {
      try {
        await act(build());
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "That did not go through.",
        );
        return;
      }
      router.refresh();
    });
  }

  return { run, pending, error, setError };
}

export function InviteMember() {
  const { run, pending, error } = useAdminAction();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [sent, setSent] = useState("");

  function send() {
    const address = email.trim();
    if (!address) return;
    setSent("");
    run(
      () => {
        const data = new FormData();
        data.set("email", address);
        data.set("role", role);
        return data;
      },
      async (data) => {
        await inviteMember(data);
        setEmail("");
        setSent(address);
      },
    );
  }

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div className="flex flex-col gap-[12px]">
      <div className="flex items-center gap-[16px]">
        <input
          type="email"
          value={email}
          disabled={pending}
          aria-label="Invite email"
          placeholder="username@email.com"
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") send();
          }}
          className="min-w-0 flex-1 rounded-[8px] border border-[#243033]! bg-[#0f141a] px-[16px] py-[10px] text-[14px] font-normal text-[#e2e8f0] outline-none placeholder:text-[#94a3b8] focus:border-[#8fb0a7]!"
        />
        <div className="w-[160px] shrink-0">
          <V2Select
            id="invite-role"
            ariaLabel="Invite role"
            value={role}
            options={ROLES}
            onChange={setRole}
            triggerClass="px-[16px] py-[10px] text-[14px] font-medium"
          />
        </div>
        <button
          type="button"
          onClick={send}
          disabled={pending || !email.trim()}
          className="flex shrink-0 cursor-pointer items-center gap-[6px] rounded-[8px] border border-[#8fb0a7]! bg-[#8fb0a7] px-[14px] py-[8px] text-[13px] font-semibold text-[#0f141a] transition-colors hover:bg-[#a3c0b8] disabled:cursor-default disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <Plus size={14} strokeWidth={2} />
          )}
          Send Invite
        </button>
      </div>

      {error ? (
        <p className="flex items-center gap-[6px] text-[13px] font-medium text-[#ef4444]">
          <AlertCircle size={14} strokeWidth={2} className="shrink-0" />
          {error}
        </p>
      ) : sent ? (
        <p className="flex items-center gap-[6px] text-[13px] font-semibold text-[#10b981]">
          <Check size={14} strokeWidth={2} className="shrink-0" />
          Invited {sent}. They can sign in with Discord using that address.
        </p>
      ) : null}
    </div>
  );
}

export function MemberRow({
  userId,
  name,
  isAdmin,
}: {
  userId: string;
  name: string;
  isAdmin: boolean;
}) {
  const { run, pending, error } = useAdminAction();
  const [confirming, setConfirming] = useState(false);

  const nextRole = isAdmin ? "member" : "admin";

  return (
    <>
      {error ? (
        <p title={error} className="truncate text-[12px] font-medium text-[#ef4444]">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run(
            () => {
              const data = new FormData();
              data.set("userId", userId);
              data.set("role", nextRole);
              return data;
            },
            setMemberRole,
          )
        }
        className="cursor-pointer rounded-[8px] border border-[#243033]! bg-[#171e24] px-[14px] py-[8px] text-[13px] font-semibold text-[#e2e8f0] transition-colors hover:border-[#2f3d42]! disabled:cursor-default disabled:opacity-60"
      >
        {isAdmin ? "Make member" : "Make admin"}
      </button>

      <button
        type="button"
        disabled={pending}
        onClick={() => setConfirming(true)}
        aria-label={`Remove ${name}`}
        className="cursor-pointer rounded-[6px] p-[8px] text-[#64748b] transition-colors hover:bg-white/[0.03] hover:text-[#ef4444] disabled:cursor-default disabled:opacity-60"
      >
        {pending ? (
          <Loader2 size={14} strokeWidth={2} className="animate-spin" />
        ) : (
          <Trash2 size={14} strokeWidth={2} />
        )}
      </button>

      <V2ConfirmDialog
        open={confirming}
        title={`Remove ${name}?`}
        description={`${name} loses access to the workspace immediately, along with their sign-in. Their audits, reviews and other work stay. This cannot be undone.`}
        confirmLabel="Remove member"
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          run(() => {
            const data = new FormData();
            data.set("userId", userId);
            return data;
          }, removeMember);
        }}
      />
    </>
  );
}

export function RevokeInvite({
  inviteId,
  email,
}: {
  inviteId: string;
  email: string;
}) {
  const { run, pending, error } = useAdminAction();

  return (
    <button
      type="button"
      disabled={pending}
      title={error || `Revoke the invite for ${email}`}
      aria-label={`Revoke the invite for ${email}`}
      onClick={() =>
        run(() => {
          const data = new FormData();
          data.set("inviteId", inviteId);
          return data;
        }, revokeInvite)
      }
      className={`flex shrink-0 cursor-pointer items-center gap-[6px] rounded-[8px] border px-[12px] py-[6px] text-[12px] font-semibold transition-colors disabled:cursor-default disabled:opacity-60 ${
        error
          ? "border-[#ef4444]! text-[#ef4444]"
          : "border-[#243033]! text-[#94a3b8] hover:border-[#2f3d42]! hover:text-[#e2e8f0]"
      }`}
    >
      {pending ? (
        <Loader2 size={12} strokeWidth={2} className="animate-spin" />
      ) : (
        <X size={12} strokeWidth={2} />
      )}
      Revoke
    </button>
  );
}
