// NovaFlow AWS Lambda backend
// Runtime: Node.js 20.x
// Install dependencies with: npm install
// DynamoDB tables use a String partition key named "id".

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient, ScanCommand, GetCommand, PutCommand, DeleteCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const db = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true }
});

const TABLES = {
  tasks: process.env.TASKS_TABLE || "NovaFlowTasks",
  events: process.env.EVENTS_TABLE || "NovaFlowEvents",
  routines: process.env.ROUTINES_TABLE || "NovaFlowRoutine",
  reminders: process.env.REMINDERS_TABLE || "NovaFlowReminders"
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": process.env.ALLOWED_ORIGIN || "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Content-Type": "application/json"
};

const response = (statusCode, body) => ({
  statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body)
});

const parseBody = (event) => {
  if (!event.body) return {};
  return typeof event.body === "string" ? JSON.parse(event.body) : event.body;
};

const getRoute = (event) => {
  const method = (event.requestContext?.http?.method || event.httpMethod || "GET").toUpperCase();
  const path = (event.rawPath || event.path || "/").replace(/\/+$/, "") || "/";
  return { method, path };
};

async function listItems(table) {
  const result = await db.send(new ScanCommand({ TableName: table }));
  return result.Items || [];
}

async function saveItem(table, body, method) {
  if (!body.id) {
    return { error: "The request body must include an id." };
  }
  const now = new Date().toISOString();
  const item = {
    ...body,
    id: String(body.id),
    createdAt: body.createdAt || now,
    updatedAt: now
  };
  await db.send(new PutCommand({ TableName: table, Item: item }));
  return { item };
}

async function removeItem(table, id) {
  if (!id) return { error: "Missing id query parameter." };
  await db.send(new DeleteCommand({
    TableName: table,
    Key: { id: String(id) }
  }));
  return { id: String(id) };
}

export const handler = async (event) => {
  const { method, path } = getRoute(event);

  if (method === "OPTIONS") return response(200, { success: true });
  if (path === "/" || path === "/health") {
    return response(200, {
      success: true,
      message: "NovaFlow API is running",
      resources: Object.keys(TABLES)
    });
  }

  const resource = path.split("/").filter(Boolean)[0];
  const table = TABLES[resource];
  if (!table) return response(404, { success: false, error: `Unknown endpoint: ${path}` });

  try {
    if (method === "GET") {
      const id = event.queryStringParameters?.id;
      if (id) {
        const result = await db.send(new GetCommand({
          TableName: table, Key: { id: String(id) }
        }));
        return response(200, { success: true, item: result.Item || null });
      }
      const items = await listItems(table);
      return response(200, { success: true, [resource]: items, items });
    }

    if (method === "POST" || method === "PUT") {
      const body = parseBody(event);
      const result = await saveItem(table, body, method);
      if (result.error) return response(400, { success: false, error: result.error });
      return response(method === "POST" ? 201 : 200, {
        success: true, message: "Saved successfully", item: result.item
      });
    }

    if (method === "DELETE") {
      const id = event.queryStringParameters?.id;
      const result = await removeItem(table, id);
      if (result.error) return response(400, { success: false, error: result.error });
      return response(200, { success: true, message: "Deleted successfully", id: result.id });
    }

    return response(405, { success: false, error: "Method not allowed" });
  } catch (error) {
    console.error("NovaFlow API error:", {
      message: error.message, name: error.name, path, method
    });
    return response(500, {
      success: false,
      error: "Server error. Check the Lambda CloudWatch logs.",
      detail: error.message
    });
  }
};
