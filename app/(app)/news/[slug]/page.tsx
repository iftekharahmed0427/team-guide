import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import PostDetail from "../../post-detail";
import { getPost, listPosts } from "../posts";

// /news/[slug] - the redesign's article detail, reading news_post from the
// database. The full list comes along to fill the related rail.
export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const { slug } = await params;
  const [post, pool] = await Promise.all([getPost(slug), listPosts()]);
  if (!post) notFound();

  return (
    <PostDetail
      kind="news"
      isAdmin={isAdmin}
      post={post}
      pool={pool}
      basePath="/news"
      copy={{ back: "Back to news", info: "Article info", related: "Related articles" }}
    />
  );
}
