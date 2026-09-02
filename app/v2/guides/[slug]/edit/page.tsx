import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import V2PostEditor from "../../../post-editor";
import { getGuide, listGuideCategories } from "../../guides";

// /v2/guides/[slug]/edit - the same composer, pre-filled with the guide. Its
// category is the real `game` column, so the picker opens on it.
export default async function V2EditGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await getSession();
  if (session?.user.role !== "admin") redirect("/v2/guides");

  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  const categories = await listGuideCategories();

  return (
    <V2PostEditor
      kind="guide"
      heading="Edit Guide"
      subheading={`Editing "${guide.title}"`}
      backHref={`/v2/guides/${slug}`}
      titleLabel="Guide Title"
      titlePlaceholder="Rust: Backup Failed or Not Found"
      bodyPlaceholder="Write the guide..."
      publishLabel="Save changes"
      categories={categories}
      categoryHint="File under a game directory"
      initial={{
        id: guide.id,
        title: guide.title,
        category: guide.category,
        html: guide.html,
        tags: guide.tags,
      }}
    />
  );
}
