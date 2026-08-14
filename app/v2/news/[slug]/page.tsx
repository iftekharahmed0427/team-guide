import { notFound } from "next/navigation";
import V2PostDetail from "../../post-detail";
import { getPost, listPosts } from "../posts";

// /v2/news/[slug] - the redesign's article detail, reading news_post from the
// database. The full list comes along to fill the related rail.
export default async function V2ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [post, pool] = await Promise.all([getPost(slug), listPosts()]);
  if (!post) notFound();

  return (
    <V2PostDetail
      post={post}
      pool={pool}
      basePath="/v2/news"
      copy={{ back: "Back to news", info: "Article info", related: "Related articles" }}
    />
  );
}
