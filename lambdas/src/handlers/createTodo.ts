import type { APIGatewayProxyHandler } from "aws-lambda";
import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ulid } from "ulid";
import { ddb, TABLE_NAME } from "../lib/dynamo";
import { created, badRequest, internalError } from "../lib/response";
import { parseJsonBody, assertTitle, assertDueDate, CreateTodoInput } from "../lib/validate";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const input = parseJsonBody<CreateTodoInput>(event.body ?? null);

    assertTitle(input.title);
    assertDueDate(input.dueDate);

    const now = new Date().toISOString();
    const item = {
      todoId: ulid(),
      title: input.title.trim(),
      completed: false,
      dueDate: input.dueDate,
      createdAt: now,
      updatedAt: now
    };

    await ddb.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: item
      })
    );

    return created(item);
  } catch (e: any) {
    if (e instanceof SyntaxError) return badRequest("Invalid JSON");
    if (typeof e?.message === "string") return badRequest(e.message);
    console.error(e);
    return internalError();
  }
};
