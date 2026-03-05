"use client"; // クライアントコンポーネントであることを明示するためのディレクティブ

// ここでは、ユーザーがTodoを作成するためのフォームを提供し、APIにリクエストを送信して結果を表示するシンプルなUIを実装しています。
// APIリクエストにはfetchを使用し、レスポンスの成功/失敗に応じて適切なメッセージやデータを表示します。

// ReactのuseStateフックを使用して、フォームの入力値やAPIからのレスポンス、エラーメッセージなどの状態を管理
import { useEffect, useState } from "react";

// Todopオブジェクトを定義
type Todo = {
  todoId: string; // Todoの識別子
  title: string; // タイトル
  completed: boolean; // ステータス
  dueDate?: string; // 期限日（オプション）
};

const apiUrl = process.env.NEXT_PUBLIC_API_BASE!; // APIのURLを環境変数から取得

// 画面コンポーネント
export default function TodosPage() {
  // Todoのリストを管理する状態
  // ジェネリクスにより、todosがTodoオブジェクトの配列であることを指定
  // 初期値は空白の配列
  const [todos, setTodos] = useState<Todo[]>([]);

  // コンポーネントの最初の描画後に一度だけ実行される処理
  // 内部のfetchTodos関数は、APIからTodoのリストを取得し、状態にセットする非同期関数
  useEffect(() => {
    const fetchTodos = async () => {
      try {
        const token = localStorage.getItem("idToken"); // ローカルストレージから認証トークンを所得
        const res = await fetch(
          // APIエンドポイントにリクエストを送信
          `${apiUrl}todos`,
          {
            headers: {
              // ヘッダーに認証トークンを付与
              Authorization: `Bearer ${token}`,
            },
          },
        );

        if (!res.ok) {
          throw new Error(`API request failed with status ${res.status}`); // レスポンスが成功でない場合はエラーをスロー
        }
        const data = await res.json();
        setTodos(data.items); // APIから取得したTodoのリストを状態にセット
      } catch (error) {
        console.error("Error fetching todos:", error); // エラーが発生した場合はコンソールにエラーメッセージを表示
      }
    };
    fetchTodos(); // fetchTodos関数を呼び出してAPIからデータを取得
  }, []); // 依存配列が空のため、fetchTodosはコンポーネントの最初の描画後に一度だけ実行される

  return (
    <div>
      <h1>Todo List</h1>
      <ul>
        {todos.map((todo) => (
          <li key={todo.todoId}>
            {todo.title} - {todo.completed ? "Completed" : "Pending"}
          </li>
        ))}
      </ul>
    </div>
  );
}
