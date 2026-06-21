"use client";

import { useTransition } from "react";
import CustomSelect from "@/app/components/custom-select";
import type { PaymentRole } from "./constants";
import { setMemberRole } from "./actions";

// Admin dropdown to assign a member's payment role. "Unassigned" (value "")
// clears it. Saves via the server action; the page re-renders from the DB.
export default function RoleCell({
  userId,
  roleId,
  roles,
}: {
  userId: string;
  roleId: string | null;
  roles: PaymentRole[];
}) {
  const [, startTransition] = useTransition();
  const options = [
    { value: "", label: "Unassigned" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <CustomSelect
      name={`role-${userId}`}
      options={options}
      defaultValue={roleId ?? ""}
      className="w-44"
      onChange={(v) =>
        startTransition(async () => {
          await setMemberRole(userId, v || null);
        })
      }
    />
  );
}
