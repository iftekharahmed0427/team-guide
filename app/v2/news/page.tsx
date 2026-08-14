import V2PostList from "../post-list";
import { listPosts } from "./posts";

// /v2/news - the redesign's news listing, now reading news_post from the
// database. Shell comes from app/v2/layout.tsx.
export default async function V2NewsPage() {
  const posts = await listPosts();

  return (
    <V2PostList
      title="News"
      subtitle={`${posts.length} post${posts.length === 1 ? "" : "s"} · announcements and updates`}
      posts={posts}
      basePath="/v2/news"
      newLabel="New post"
      allLabel="All articles"
      groupBy="tag"
      facetSubtitle="Filter by tag"
    />
  );
}
