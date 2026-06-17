// The board's columns. `id` is the value stored in board_task.status.
export const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
] as const;

export type Status = (typeof COLUMNS)[number]["id"];

const STATUSES = COLUMNS.map((c) => c.id) as readonly string[];

export function isStatus(value: string): value is Status {
  return STATUSES.includes(value);
}

// A member who can be assigned to a card.
export type Member = {
  id: string;
  name: string;
  image: string | null;
};

export type Task = {
  id: string;
  title: string;
  note: string;
  status: string;
  position: number;
  // Members assigned to this card (admin-managed). Kept fresh by reconcile.
  assignees: Member[];
  // How many comments the card has — shown as a badge on the card face.
  commentCount: number;
};

export type Comment = {
  id: string;
  taskId: string;
  body: string;
  authorId: string | null;
  authorName: string;
  authorImage: string | null;
  createdAt: string;
};

// Display name for an assignment/comment author (name, else email, else fallback).
export function displayName(name?: string | null, email?: string | null): string {
  return (name ?? "").trim() || (email ?? "").trim() || "Member";
}
