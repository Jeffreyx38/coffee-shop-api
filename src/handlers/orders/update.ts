import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { badRequest, ok, notFound, serverError } from "../../utils/http";

type OrderStatus =
  | "PLACED"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "CANCELLED";

const nextAllowed: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ["PAID", "CANCELLED"],
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["PICKED_UP", "CANCELLED"],
  PICKED_UP: [],
  CANCELLED: [],
};

export const handler = async (event: any) => {
  try {
    const id = event.pathParameters?.id;
    if (!id || !event.body) return badRequest("Missing id/body");
    const { status } = JSON.parse(event.body) as { status?: OrderStatus };
    if (!status) return badRequest("Provide status");

    const ddb = getClient();
    const current = await ddb.send(
      new GetCommand({ TableName: process.env.ORDERS_TABLE, Key: { id } })
    );
    if (!current.Item) return notFound("Order not found");

    const from = current.Item.status as OrderStatus;
    if (!nextAllowed[from]?.includes(status)) {
      return badRequest(`Invalid transition ${from} → ${status}`);
    }

    const out = await ddb.send(
      new UpdateCommand({
        TableName: process.env.ORDERS_TABLE,
        Key: { id },
        UpdateExpression: "SET #s = :s, updatedAt = :u",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":s": status,
          ":u": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      })
    );

    return ok(out.Attributes);
  } catch (e) {
    console.error(e);
    return serverError();
  }
};
