import V2Dashboard from "./v2-dashboard";

// /v2 - the canvas for the full redesign. Deliberately outside the (app) route
// group so it does not inherit the current sidebar layout. Still auth-gated in
// production by proxy.ts, which matches every route except sign-in and static
// files. The shell (sidebar + scrolling main) lives in layout.tsx.
export default function V2Page() {
  return <V2Dashboard />;
}
