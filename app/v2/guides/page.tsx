import { GUIDES } from "../guides-data";
import V2PostList from "../post-list";

// /v2/guides - the redesign's guide listing. Same layout as News, since the
// frames carry no separate guides design. Shell comes from app/v2/layout.tsx.
export default function V2GuidesPage() {
  return (
    <V2PostList
      title="Guides"
      subtitle="How the team handles the work"
      posts={GUIDES}
      basePath="/v2/guides"
      newLabel="New guide"
      allLabel="All guides"
    />
  );
}
