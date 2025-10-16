import { GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { badRequest, noContent, notFound, serverError } from "../../utils/http";

type OrderStatus =
  | "PLACED"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "CANCELLED";

export const handler = async (event: any) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("Missing id");

    const ddb = getClient();
    const cur = await ddb.send(
      new GetCommand({ TableName: process.env.ORDERS_TABLE, Key: { id } })
    );
    if (!cur.Item) return notFound("Order not found");

    const status = cur.Item.status as OrderStatus;
    if (status === "READY" || status === "PICKED_UP") {
      return badRequest(`Cannot cancel when status is ${status}`);
    }

    await ddb.send(
      new UpdateCommand({
        TableName: process.env.ORDERS_TABLE,
        Key: { id },
        UpdateExpression: "SET #s = :s, updatedAt = :u",
        ExpressionAttributeNames: { "#s": "status" },
        ExpressionAttributeValues: {
          ":s": "CANCELLED",
          ":u": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(id)",
      })
    );

    return noContent();
  } catch (e) {
    console.error(e);
    return serverError();
  }
};
