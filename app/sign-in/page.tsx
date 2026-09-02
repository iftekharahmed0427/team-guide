import Image from "next/image";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Figtree } from "next/font/google";
import { AlertCircle, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/auth";
import SignInButton from "./sign-in-button";

// The sign-in page, in the redesign's palette: the same dark ground, hairline
// edges and sage accent as /v2, with the sidebar's brand lockup at the top of
// the card.
//
// It sits outside the (app) group and outside /v2, so it does not inherit
// either shell. Figtree is scoped here the way app/v2/layout.tsx scopes it,
// since globals.css sets Geist on <body>.

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/");

  // A rejected sign-in comes back here rather than to a Discord error page.
  // Access is invite-only, so much the commonest reason is an account that is
  // not on the list; anything else is passed through as it arrived.
  const { error } = await searchParams;
  const message = error
    ? error.toLowerCase().includes("forbidden") ||
      error.toLowerCase().includes("allow")
      ? "That Discord account is not on the team allow list. Ask an admin to invite the email it uses."
      : "That sign-in did not go through. Try again, or ask an admin if it keeps failing."
    : null;

  // globals.css sets an unlayered `* { border-color: var(--border) }`, which
  // wins over Tailwind's layered border utilities, so borders are marked
  // important to opt out of the app-wide default.
  return (
    <div
      className={`${figtree.className} flex min-h-screen items-center justify-center bg-[#0e1217] p-[24px] leading-[normal]`}
    >
      <div className="flex w-[420px] max-w-full flex-col gap-[28px] rounded-[16px] border border-[#243033]! bg-[#171e24] p-[32px] shadow-[0px_18px_48px_-12px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-[12px]">
          <span className="size-[36px] shrink-0 overflow-hidden rounded-[4px]">
            <Image
              src="/logo.png"
              alt="Gravel Host"
              width={2018}
              height={819}
              priority
              className="size-full object-contain"
            />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[18px] font-bold text-[#e2e8f0]">
              GRAVEL HOST
            </span>
            <span className="block truncate text-[11px] font-semibold text-[#ff7a59]">
              TEAM PORTAL
            </span>
          </span>
        </div>

        <div className="flex flex-col gap-[6px]">
          <h1 className="text-[24px] font-bold text-[#e2e8f0]">Sign in</h1>
          <p className="text-[14px] font-normal text-[#94a3b8]">
            Use your Discord account to reach the team workspace.
          </p>
        </div>

        {message ? (
          <p className="flex items-start gap-[8px] rounded-[8px] border border-[#ef4444]/40! bg-[#ef4444]/[0.06] px-[14px] py-[12px] text-[13px] font-medium text-[#ef4444]">
            <AlertCircle
              size={14}
              strokeWidth={2}
              className="mt-[2px] shrink-0"
            />
            {message}
          </p>
        ) : null}

        <SignInButton />

        <div className="h-px w-full bg-[#243033]" />

        <div className="flex items-start gap-[10px]">
          <ShieldCheck
            size={16}
            strokeWidth={2}
            className="mt-[1px] shrink-0 text-[#8fb0a7]"
          />
          <p className="text-[13px] leading-[1.5] font-normal text-[#64748b]">
            Access is invite only. If you cannot sign in, ask an admin to invite
            the email your Discord account uses.
          </p>
        </div>
      </div>
    </div>
  );
}
