import { notFound } from "next/navigation";
import V2PostDetail from "../../post-detail";
import { getGuide, listGuides } from "../guides";

// /v2/guides/[slug] - the redesign's guide detail, sharing the article layout.
// The full list comes along to fill the related rail.
export default async function V2GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [guide, pool] = await Promise.all([getGuide(slug), listGuides()]);
  if (!guide) notFound();

  return (
    <V2PostDetail
      post={guide}
      pool={pool}
      basePath="/v2/guides"
      copy={{ back: "Back to guides", info: "Guide info", related: "Related guides" }}
    />
  );
}
