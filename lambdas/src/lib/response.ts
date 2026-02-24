import type { APIGatewayProxyResult } from "aws-lambda";

const defaultHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};

export const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: defaultHeaders,
  body: JSON.stringify(body)
});

export const ok = (body: unknown) => json(200, body);
export const created = (body: unknown) => json(201, body);
export const badRequest = (message: string, details?: unknown) =>
  json(400, { message, details });
export const notFound = (message = "Not Found") => json(404, { message });
export const internalError = (message = "Internal Server Error") =>
  json(500, { message });
