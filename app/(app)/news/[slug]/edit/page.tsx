import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PostEditor from "../../../post-editor";
import { getPost, listNewsCategories } from "../../posts";

// /news/[slug]/edit - the composer again, pre-filled. There is no frame for
// editing and none is needed: it is the "new-post-page" frame with a different
// heading and publish label, which is how the live app does it too.
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/news");

  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const categories = await listNewsCategories();

  return (
    <PostEditor
      kind="news"
      heading="Edit Announcement"
      subheading={`Editing "${post.title}"`}
      backHref={`/news/${slug}`}
      titleLabel="Post Title"
      titlePlaceholder="Gravel Host Q3 SLA Routing Upgrades"
      bodyPlaceholder="Write the announcement..."
      publishLabel="Save changes"
      categories={categories}
      categoryHint="Assign to an operations directory"
      initial={{
        id: post.id,
        title: post.title,
        category: post.category,
        html: post.html,
        tags: post.tags,
      }}
    />
  );
}
