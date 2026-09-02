import { Figtree } from "next/font/google";
import NotFoundContent from "./not-found-content";

// The 404 for a URL that matches no route at all, which is where an old /v2
// bookmark now lands. It renders under the root layout with no shell, so it
// scopes Figtree and paints its own ground the way the sign-in page does;
// globals.css sets Geist on <body>.

const figtree = Figtree({ subsets: ["latin"], variable: "--font-figtree" });

export default function NotFound() {
  return (
    <div
      className={`${figtree.className} flex min-h-screen w-full items-center justify-center bg-[#0e1217] leading-[normal]`}
    >
      <NotFoundContent />
    </div>
  );
}
