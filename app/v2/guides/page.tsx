import V2PostList from "../post-list";
import { listGuides } from "./guides";

// /v2/guides - the redesign's guide listing, reading the `guide` table. Same
// layout as News, since the frames carry no separate guides design; the rail
// filters by game, which is the category guides actually have.
export default async function V2GuidesPage() {
  const guides = await listGuides();

  return (
    <V2PostList
      title="Guides"
      subtitle={`${guides.length} guide${guides.length === 1 ? "" : "s"} · how the team handles the work`}
      posts={guides}
      basePath="/v2/guides"
      newLabel="New guide"
      allLabel="All guides"
      groupBy="category"
      facetSubtitle="Filter by game"
    />
  );
}
