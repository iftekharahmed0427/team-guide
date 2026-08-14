import { notFound } from "next/navigation";
import { GUIDES } from "../../guides-data";
import V2PostDetail from "../../post-detail";

// /v2/guides/[slug] - the redesign's guide detail, sharing the article layout.
export default async function V2GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = GUIDES.find((g) => g.slug === slug);
  if (!guide) notFound();

  return (
    <V2PostDetail
      post={guide}
      pool={GUIDES}
      basePath="/v2/guides"
      copy={{ back: "Back to guides", info: "Guide info", related: "Related guides" }}
    />
  );
}
