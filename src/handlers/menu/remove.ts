import { DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { noContent, badRequest, notFound, serverError } from "../../utils/http";

export const handler = async (event: any) => {
  try {
    const id = event.pathParameters?.id;
    if (!id) return badRequest("Missing id");

    await getClient().send(
      new DeleteCommand({
        TableName: process.env.MENU_TABLE,
        Key: { id },
        ConditionExpression: "attribute_exists(id)",
      })
    );

    return noContent();
  } catch (e: any) {
    if (e?.name === "ConditionalCheckFailedException")
      return notFound("Menu item not found");
    console.error(e);
    return serverError();
  }
};
