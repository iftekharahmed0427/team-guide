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

export type Task = {
  id: string;
  title: string;
  note: string;
  status: string;
  position: number;
};
