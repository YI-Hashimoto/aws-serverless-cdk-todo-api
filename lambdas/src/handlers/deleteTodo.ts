import type { APIGatewayProxyHandler, APIGatewayProxyEvent } from "aws-lambda";
import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamo";
import { ok, badRequest, notFound, internalError } from "../lib/response";

/** Cognito groups を event から取得（環境差に強い版） */
function getGroups(event: APIGatewayProxyEvent): string[] {
  const claims = (event.requestContext as any)?.authorizer?.claims as
    | Record<string, unknown>
    | undefined;

  const raw = claims?.["cognito:groups"];
  if (!raw) return [];

  // 配列で来るケースに対応
  if (Array.isArray(raw)) {
    return raw
      .map(String) // 念のため全要素を文字列化
      .map((s) => s.trim()) // 前後の空白を除去
      .filter(Boolean); // 空文字を除外
  }

  // 文字列（"Admin,User" 等）で来るケースに対応
  return String(raw)
    .split(",") // カンマで分割
    .map((s) => s.trim()) // 前後の空白を除去
    .filter(Boolean); // 空文字を除外
}

function requireAdmin(event: APIGatewayProxyEvent) {
  const groups = getGroups(event);
  if (!groups.includes("Admin")) {
    return {
      statusCode: 403,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Forbidden (Admin only)" }),
    };
  }
  return null;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const forbidden = requireAdmin(event);
  if (forbidden) return forbidden;

  try {
    const todoId = event.pathParameters?.todoId;
    if (!todoId) return badRequest("todoId is required");

    await ddb.send(
      new DeleteCommand({
        TableName: TABLE_NAME,
        Key: { todoId },
        ConditionExpression: "attribute_exists(todoId)",
      }),
    );

    return ok({ deleted: true, todoId });
  } catch (e: any) {
    if (e?.name === "ConditionalCheckFailedException") {
      return notFound("todo not found");
    }
    console.error(e);
    return internalError();
  }
};
