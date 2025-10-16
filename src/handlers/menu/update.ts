import { UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { ok, badRequest, notFound, serverError } from "../../utils/http";

/**
 * Accepts any subset of: name, category, sizes, isAvailable, tags
 * sizes = [{ name: string, priceCents: number }]
 */
export const handler = async (event: any) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("Missing id");
    if (!event.body) return badRequest("Missing body");

    const payload = JSON.parse(event.body);

    // Nothing to update?
    const allowed = ["name", "category", "sizes", "isAvailable", "tags"];
    const keys = Object.keys(payload).filter((k) => allowed.includes(k));
    if (keys.length === 0) {
      return badRequest(`Provide one of: ${allowed.join(", ")}`);
    }

    // Build expression
    const setExpr: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};

    for (const k of keys) {
      const nameKey = `#${k[0]}`; // e.g. #n, #c, #s ...
      const valueKey = `:${k[0]}`;
      names[nameKey] = k;
      values[valueKey] = payload[k];
      setExpr.push(`${nameKey} = ${valueKey}`);
    }

    const out = await getClient().send(
      new UpdateCommand({
        TableName: process.env.MENU_TABLE,
        Key: { id },
        UpdateExpression: "SET " + setExpr.join(", "),
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      })
    );

    return ok(out.Attributes);
  } catch (e: any) {
    if (e?.name === "ConditionalCheckFailedException")
      return notFound("Menu item not found");
    console.error(e);
    return serverError();
  }
};
