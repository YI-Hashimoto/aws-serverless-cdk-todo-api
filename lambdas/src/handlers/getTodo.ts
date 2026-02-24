import type { APIGatewayProxyHandler } from "aws-lambda";
import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamo";
import { ok, badRequest, notFound, internalError } from "../lib/response";

export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const todoId = event.pathParameters?.todoId;
    if (!todoId) return badRequest("todoId is required");

    const res = await ddb.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { todoId }
      })
    );

    if (!res.Item) return notFound("todo not found");
    return ok(res.Item);
  } catch (e) {
    console.error(e);
    return internalError();
  }
};
