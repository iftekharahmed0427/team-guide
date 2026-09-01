"use client";

import {
  createRole,
  deleteRole,
  renameRole,
  setRoleBonusEligible,
  setRolePayType,
} from "@/app/(app)/settings/payment-roles/actions";
import {
  createCategory,
  deleteCategory,
  renameCategory,
} from "@/app/(app)/settings/dispute-categories/actions";
import {
  createSource,
  deleteSource,
  renameSource,
} from "@/app/(app)/settings/review-sources/actions";
import ListManager, { type ListEntry } from "./list-manager";

// The three catalogues, each binding the live actions to the shared list. Thin
// on purpose: the behaviour is in list-manager.tsx and the writes are the live
// server actions, so v2 owns none of the logic.

export function RolesManager({ entries }: { entries: ListEntry[] }) {
  return (
    <ListManager
      entries={entries}
      noun="role"
      onCreate={createRole}
      onRename={renameRole}
      onDelete={deleteRole}
      onFlag={(id, key, value) =>
        key === "paidPerTicket"
          ? setRolePayType(id, value)
          : setRoleBonusEligible(id, value)
      }
      deleteWarning="Deleting a role unassigns the members on it; their pay falls back to per ticket."
    />
  );
}

export function CategoriesManager({ entries }: { entries: ListEntry[] }) {
  return (
    <ListManager
      entries={entries}
      noun="category"
      onCreate={createCategory}
      onRename={renameCategory}
      onDelete={deleteCategory}
      deleteWarning="Disputes already logged keep the category name they were saved with."
    />
  );
}

export function SourcesManager({ entries }: { entries: ListEntry[] }) {
  return (
    <ListManager
      entries={entries}
      noun="source"
      onCreate={createSource}
      onRename={renameSource}
      onDelete={deleteSource}
      deleteWarning="Renaming a source relabels it on existing reviews too."
    />
  );
}
