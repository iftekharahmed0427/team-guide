import { ARTICLES } from "../news-data";
import V2PostList from "../post-list";

// /v2/news - the redesign's news listing. Shell comes from app/v2/layout.tsx.
export default function V2NewsPage() {
  return (
    <V2PostList
      title="News"
      subtitle="All announcements and updates"
      posts={ARTICLES}
      basePath="/v2/news"
      newLabel="New post"
      allLabel="All articles"
    />
  );
}
