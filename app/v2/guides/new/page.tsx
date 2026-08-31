import V2PostEditor from "../../post-editor";
import { listGuideCategories } from "../guides";

// /v2/guides/new - the same composer in its guide form. Guides file under a
// game, which is a real category list, so the rail reads from game_category.
export default async function V2NewGuidePage() {
  const categories = await listGuideCategories();

  return (
    <V2PostEditor
      heading="Create Guide"
      subheading="Write a how-to for the team, filed under a game"
      backHref="/v2/guides"
      titleLabel="Guide Title"
      titlePlaceholder="Rust: Backup Failed or Not Found"
      bodyPlaceholder="Write the guide..."
      publishLabel="Publish guide"
      categories={categories}
      categoryHint="File under a game directory"
    />
  );
}
