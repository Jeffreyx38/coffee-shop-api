import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { ok, serverError } from "../../utils/http";

export const handler = async () => {
  try {
    const out = await getClient().send(
      new ScanCommand({ TableName: process.env.ORDERS_TABLE, Limit: 200 })
    );
    return ok({ items: out.Items ?? [] });
  } catch (e) {
    console.error(e);
    return serverError();
  }
};
