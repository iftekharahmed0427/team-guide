import { notFound } from "next/navigation";
import V2PostEditor from "../../../post-editor";
import { getPost, listNewsCategories } from "../../posts";

// /v2/news/[slug]/edit - the composer again, pre-filled. There is no frame for
// editing and none is needed: it is the "new-post-page" frame with a different
// heading and publish label, which is how the live app does it too.
export default async function V2EditPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  const categories = await listNewsCategories();

  return (
    <V2PostEditor
      heading="Edit Announcement"
      subheading={`Editing "${post.title}"`}
      backHref={`/v2/news/${slug}`}
      titleLabel="Post Title"
      titlePlaceholder="Gravel Host Q3 SLA Routing Upgrades"
      bodyPlaceholder="Write the announcement..."
      publishLabel="Save changes"
      categories={categories}
      categoryHint="Assign to an operations directory"
      initial={{ title: post.title, category: post.category, html: post.html }}
    />
  );
}
