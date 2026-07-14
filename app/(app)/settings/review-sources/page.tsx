import { getReviewSources } from "@/lib/reviews";
import SourcesManager from "./sources-manager";

// Admin-only (the Settings layout gates non-admins). Manage the catalog of
// sources shown in the /reviews form's Source picker.
export default async function ReviewSourcesPage() {
  const sources = await getReviewSources();

  return (
    <div className="fx-rise mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Review sources</h2>
        <p className="text-xs text-muted">
          The source options shown in the Reviews form. Add, rename, or remove them here. Renaming
          one updates its label on existing reviews too.
        </p>
      </div>

      <SourcesManager sources={sources} />
    </div>
  );
}
