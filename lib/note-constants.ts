// The note size limits, shared by the action that enforces them and the forms
// that stop you exceeding them.
//
// Their own module because lib/actions/notes.ts is a "use server" file, which
// may only export async functions.

// A note can be a paragraph or a runbook, so the ceiling is generous. It is
// still a ceiling: the body is stored as plain text in one column.
export const MAX_NOTE_BODY = 20000;
export const MAX_NOTE_TITLE = 120;
