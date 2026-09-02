import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PostEditor from "../../post-editor";
import { listGuideCategories } from "../guides";

// /guides/new - the same composer in its guide form. Guides file under a
// game, which is a real category list, so the rail reads from game_category.
export default async function NewGuidePage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/guides");

  const categories = await listGuideCategories();

  return (
    <PostEditor
      kind="guide"
      heading="Create Guide"
      subheading="Write a how-to for the team, filed under a game"
      backHref="/guides"
      titleLabel="Guide Title"
      titlePlaceholder="Rust: Backup Failed or Not Found"
      bodyPlaceholder="Write the guide..."
      publishLabel="Publish guide"
      categories={categories}
      categoryHint="File under a game directory"
    />
  );
}
