"use client";

import { useState } from "react";

type CreateTodoResponse = {
  todoId: string;
  title: string;
  completed: boolean;
  dueDate?: string;
};

export default function TodosPage() {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [result, setResult] = useState<CreateTodoResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createTodo = async () => {
    setError(null);
    setResult(null);

    const apiBase = process.env.NEXT_PUBLIC_API_BASE!;
    const idToken = localStorage.getItem("id_token");

    if (!idToken) {
      setError("トークンがありません。ログインし直してください。");
      return;
    }

    const res = await fetch(`${apiBase}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // ✅ API Gateway側の設定により Bearer が必要なことが多い
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        title,
        dueDate: dueDate || undefined,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      setError(`API error: ${res.status} ${text}`);
      return;
    }

    const data = (await res.json()) as CreateTodoResponse;
    setResult(data);
    setTitle("");
    setDueDate("");
  };

  return (
    <main style={{ padding: 24 }}>
      <h1>Create Todo</h1>

      <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
        <label>
          Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>

        <label>
          Due Date (YYYY-MM-DD)
          <input
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="2026-02-28"
          />
        </label>

        <button onClick={createTodo} disabled={!title.trim()}>
          登録
        </button>
      </div>

      {error && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>{error}</pre>
      )}

      {result && (
        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
