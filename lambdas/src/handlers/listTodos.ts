import type { APIGatewayProxyHandler } from "aws-lambda";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { ddb, TABLE_NAME } from "../lib/dynamo";
import { ok, internalError } from "../lib/response";

/**
 * MVPとして Scan で一覧取得。
 * 後で Cognito を入れるなら userId をPKにして Query に変更するのが定石。
 */
export const handler: APIGatewayProxyHandler = async (event) => {
  try {
    const limitRaw = event.queryStringParameters?.limit;
    const limit = limitRaw ? Math.min(Math.max(Number(limitRaw), 1), 100) : 50;

    const res = await ddb.send(
      new ScanCommand({
        TableName: TABLE_NAME,
        Limit: limit
      })
    );

    // createdAt desc で返したい場合は、ここでソート（本来は設計でQueryに寄せる）
    const items = (res.Items ?? []).sort((a: any, b: any) =>
      String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? ""))
    );

    return ok({ items, count: items.length });
  } catch (e) {
    console.error(e);
    return internalError();
  }
};
