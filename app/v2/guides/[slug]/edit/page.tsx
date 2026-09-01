import { notFound } from "next/navigation";
import V2PostEditor from "../../../post-editor";
import { getGuide, listGuideCategories } from "../../guides";

// /v2/guides/[slug]/edit - the same composer, pre-filled with the guide. Its
// category is the real `game` column, so the picker opens on it.
export default async function V2EditGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = await getGuide(slug);
  if (!guide) notFound();

  const categories = await listGuideCategories();

  return (
    <V2PostEditor
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
        title: guide.title,
        category: guide.category,
        html: guide.html,
      }}
    />
  );
}
