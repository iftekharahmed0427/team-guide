import Link from "next/link";
import {
  BookOpen,
  Compass,
  LayoutDashboard,
  Newspaper,
  SquareKanban,
  StickyNote,
} from "lucide-react";

// The 404, rendered inside the (app) layout so the sidebar and the search
// palette stay put: a miss should read as one page failing, not the portal
// being down, and the way out is the nav that is already there.
//
// It covers both kinds of miss. A page that calls notFound() lands here through
// this boundary, and a URL matching no route at all gets here through the
// [...unmatched] catch-all beside it, which exists so that case keeps the shell
// too.

const SUGGESTIONS = [
  { label: "News", href: "/news", icon: Newspaper },
  { label: "Guides", href: "/guides", icon: BookOpen },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Board", href: "/board", icon: SquareKanban },
];

// globals.css sets an unlayered `* { border-color: var(--border) }`, which wins
// over Tailwind's layered border utilities, so borders are marked important to
// opt out of the app-wide default.
export default function NotFound() {
  return (
    <div className="flex min-h-full w-full items-center justify-center p-[32px]">
      <div className="flex w-full max-w-[560px] flex-col items-center gap-[28px]">
        <div className="flex flex-col items-center gap-[16px] text-center">
          <span className="flex size-[56px] items-center justify-center rounded-full bg-[#171e24]">
            <Compass size={26} strokeWidth={2} className="text-[#8fb0a7]" />
          </span>
          <p className="text-[64px] leading-none font-bold tracking-[-2px] text-[#243033]">
            404
          </p>
          <div className="flex flex-col gap-[8px]">
            <h1 className="text-[24px] font-bold text-[#e2e8f0]">
              This page does not exist
            </h1>
            <p className="text-[14px] leading-[1.6] font-normal text-[#94a3b8]">
              The link may be out of date, or whatever it pointed at has since
              been deleted. Nothing is broken on your end.
            </p>
          </div>
        </div>

        <Link
          href="/"
          className="flex items-center gap-[10px] rounded-[8px] bg-[#8fb0a7] px-[20px] py-[12px] text-[14px] font-semibold text-[#0e1217] transition-colors hover:bg-[#a3c0b8]"
        >
          <LayoutDashboard size={15} strokeWidth={2} />
          Back to the dashboard
        </Link>

        <div className="flex w-full flex-col gap-[12px]">
          <div className="flex items-center gap-[12px]">
            <span className="h-px flex-1 bg-[#243033]" />
            <span className="text-[11px] font-bold tracking-[0.5px] text-[#64748b] uppercase">
              Try one of these
            </span>
            <span className="h-px flex-1 bg-[#243033]" />
          </div>

          <div className="grid grid-cols-4 gap-[10px]">
            {SUGGESTIONS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex flex-col items-center gap-[8px] rounded-[10px] border border-[#243033]! bg-[#171e24] px-[12px] py-[16px] text-[13px] font-semibold text-[#94a3b8] transition-colors hover:border-[#2f3d42]! hover:text-[#e2e8f0]"
                >
                  <Icon size={16} strokeWidth={2} className="text-[#8fb0a7]" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          <p className="text-center text-[12px] font-normal text-[#64748b]">
            Press Ctrl or Cmd + K to search news, guides and notes.
          </p>
        </div>
      </div>
    </div>
  );
}
