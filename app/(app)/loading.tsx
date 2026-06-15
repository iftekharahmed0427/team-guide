import { Loader2 } from "lucide-react";

// Route-level fallback for the (app) shell: shown in the main content area
// (the sidebar/layout stays put) while a tab's page loads.
export default function Loading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <Loader2 size={26} strokeWidth={1.75} className="animate-spin text-muted" />
    </div>
  );
}
