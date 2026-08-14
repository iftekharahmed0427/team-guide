import { notFound } from "next/navigation";
import { ARTICLES } from "../../news-data";
import V2PostDetail from "../../post-detail";

// /v2/news/[slug] - the redesign's article detail, sharing the layout with
// guides. Shell comes from app/v2/layout.tsx.
export default async function V2ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) notFound();

  return (
    <V2PostDetail
      post={article}
      pool={ARTICLES}
      basePath="/v2/news"
      copy={{ back: "Back to news", info: "Article info", related: "Related articles" }}
    />
  );
}
