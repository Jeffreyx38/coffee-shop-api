import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { ok, notFound, badRequest, serverError } from "../../utils/http";

export const handler = async (event: any) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("Missing id");

    const out = await getClient().send(
      new GetCommand({
        TableName: process.env.MENU_TABLE,
        Key: { id },
      })
    );

    if (!out.Item) return notFound("Menu item not found");
    return ok(out.Item);
  } catch (e) {
    console.error(e);
    return serverError();
  }
};
