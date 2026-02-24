export type CreateTodoInput = {
  title: string;
  dueDate?: string; // YYYY-MM-DD
};

export type UpdateTodoInput = {
  title?: string;
  dueDate?: string | null;
  completed?: boolean;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const parseJsonBody = <T>(raw: string | null): T => {
  if (!raw) throw new Error("Body is required");
  return JSON.parse(raw) as T;
};

export const assertTitle = (title: unknown) => {
  if (typeof title !== "string" || title.trim().length === 0) {
    throw new Error("title is required");
  }
  if (title.length > 200) {
    throw new Error("title must be <= 200 chars");
  }
};

export const assertDueDate = (dueDate: unknown) => {
  if (dueDate === undefined || dueDate === null) return;
  if (typeof dueDate !== "string" || !DATE_RE.test(dueDate)) {
    throw new Error("dueDate must be YYYY-MM-DD");
  }
};
