import { getDisputeCategories } from "@/lib/disputes";
import CategoriesManager from "./categories-manager";

// Admin-only (the Settings layout gates non-admins). Manage the catalog of
// categories shown in the /disputes form's Category picker.
export default async function DisputeCategoriesPage() {
  const categories = await getDisputeCategories();

  return (
    <div className="fx-rise mx-auto flex w-full max-w-2xl flex-col gap-4">
      <div>
        <h2 className="text-sm font-semibold tracking-tight">Dispute categories</h2>
        <p className="text-xs text-muted">
          The category options shown in the Disputes form. Add, rename, or remove them here.
        </p>
      </div>

      <CategoriesManager categories={categories} />
    </div>
  );
}
