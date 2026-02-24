import type { APIGatewayProxyHandler } from "aws-lambda";
import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamo";
import { ok, badRequest, notFound, internalError } from "../lib/response";
import { parseJsonBody, assertTitle, assertDueDate, UpdateTodoInput } from "../lib/validate";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const todoId = event.pathParameters?.todoId;
    if (!todoId) return badRequest("todoId is required");

    const input = parseJsonBody<UpdateTodoInput>(event.body ?? null);

    if (input.title !== undefined) assertTitle(input.title);
    if (input.dueDate !== undefined) assertDueDate(input.dueDate);

    const now = new Date().toISOString();

    // 更新対象の式を動的に構築
    const setExpr: string[] = ["#updatedAt = :updatedAt"];
    const names: Record<string, string> = { "#updatedAt": "updatedAt" };
    const values: Record<string, any> = { ":updatedAt": now };

    if (input.title !== undefined) {
      setExpr.push("#title = :title");
      names["#title"] = "title";
      values[":title"] = input.title.trim();
    }
    if (input.completed !== undefined) {
      setExpr.push("#completed = :completed");
      names["#completed"] = "completed";
      values[":completed"] = input.completed;
    }
    if (input.dueDate !== undefined) {
      setExpr.push("#dueDate = :dueDate");
      names["#dueDate"] = "dueDate";
      values[":dueDate"] = input.dueDate; // null も許可（期限削除）
    }

    if (setExpr.length === 1) return badRequest("No fields to update");

    const res = await ddb.send(
      new UpdateCommand({
        TableName: TABLE_NAME,
        Key: { todoId },
        UpdateExpression: "SET " + setExpr.join(", "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ReturnValues: "ALL_NEW",
        // ないIDを更新しようとしたら弾く
        ConditionExpression: "attribute_exists(todoId)"
      })
    );

    return ok(res.Attributes);
  } catch (e: any) {
    if (e?.name === "ConditionalCheckFailedException") {
      return notFound("todo not found");
    }
    if (typeof e?.message === "string") return badRequest(e.message);
    console.error(e);
    return internalError();
  }
};
