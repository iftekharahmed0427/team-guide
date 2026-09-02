import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import PostDetail from "../../post-detail";
import { getGuide, listGuides } from "../guides";

// /guides/[slug] - the redesign's guide detail, sharing the article layout.
// The full list comes along to fill the related rail.
export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  const isAdmin = session?.user.role === "admin";

  const { slug } = await params;
  const [guide, pool] = await Promise.all([getGuide(slug), listGuides()]);
  if (!guide) notFound();

  return (
    <PostDetail
      kind="guide"
      isAdmin={isAdmin}
      post={guide}
      pool={pool}
      basePath="/guides"
      copy={{ back: "Back to guides", info: "Guide info", related: "Related guides" }}
    />
  );
}
