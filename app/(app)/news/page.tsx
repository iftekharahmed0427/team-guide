import { getSession } from "@/lib/auth";
import PostList from "../post-list";
import { listPosts } from "./posts";

// /news - the redesign's news listing, now reading news_post from the
// database. Shell comes from app/layout.tsx.
export default async function NewsPage() {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";
  const posts = await listPosts();

  return (
    <PostList
      title="News"
      subtitle={`${posts.length} post${posts.length === 1 ? "" : "s"} · announcements and updates`}
      isAdmin={isAdmin}
      posts={posts}
      basePath="/news"
      newLabel="New post"
      allLabel="All articles"
      groupBy="tag"
      facetSubtitle="Filter by tag"
    />
  );
}
