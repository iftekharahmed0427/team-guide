"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import CustomSelect from "@/app/components/custom-select";
import { assignReview } from "./actions";

type Member = { id: string; name: string };

// Admin-only control on a review card: credit the review to a member (or clear
// it). Keyed by the current assignee so a live refresh re-seeds the select.
export default function ReviewAssign({
  reviewId,
  assignedToId,
  members,
}: {
  reviewId: string;
  assignedToId: string | null;
  members: Member[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const options = [
    { value: "", label: "Unassigned" },
    ...members.map((m) => ({ value: m.id, label: m.name })),
  ];

  function onChange(v: string) {
    if ((v || null) === (assignedToId ?? null)) return;
    startTransition(async () => {
      await assignReview(reviewId, v || null);
      router.refresh();
    });
  }

  return (
    <CustomSelect
      key={assignedToId ?? "none"}
      name={`assign-${reviewId}`}
      options={options}
      defaultValue={assignedToId ?? ""}
      onChange={onChange}
      className={`w-full ${pending ? "pointer-events-none opacity-60" : ""}`}
    />
  );
}
