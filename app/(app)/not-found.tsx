import NotFoundContent from "../not-found-content";

// The 404 for a page inside the shell that called notFound(). Rendered within
// the (app) layout, so the sidebar and the search palette stay put and the miss
// reads as one page failing rather than the whole portal.

export default function AppNotFound() {
  return (
    <div className="flex min-h-full flex-col justify-center">
      <NotFoundContent />
    </div>
  );
}
