import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PostEditor from "../../post-editor";
import { listNewsCategories } from "../posts";

// /news/new - the composer from the "new-post-page" frame, in its news form.
// Categories come from the tags already in use, since news_post has no category
// column of its own.
export default async function NewPostPage() {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/news");

  const categories = await listNewsCategories();

  return (
    <PostEditor
      kind="news"
      heading="Create Announcement"
      subheading="Draft and publish a new article for client workspaces"
      backHref="/news"
      titleLabel="Post Title"
      titlePlaceholder="Gravel Host Q3 SLA Routing Upgrades"
      bodyPlaceholder="Write the announcement..."
      publishLabel="Publish post"
      categories={categories}
      categoryHint="Assign to an operations directory"
    />
  );
}
