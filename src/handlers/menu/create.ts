import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "crypto";
import { getClient } from "../../lib/ddb";
import { badRequest, created, serverError } from "../../utils/http";

type MenuSize = { name: string; priceCents: number };
type MenuItem = {
  id: string;
  name: string;
  category?: string;
  sizes: MenuSize[];
  isAvailable: boolean;
  tags?: string[];
  createdAt: string;
  updatedAt?: string;
};

export const handler = async (event: any) => {
  try {
    if (!event.body) return badRequest("Missing body");

    const {
      name,
      category,
      sizes,
      isAvailable = true,
      tags,
    } = JSON.parse(event.body);

    // minimal validation
    if (!name || !Array.isArray(sizes) || sizes.length === 0) {
      return badRequest(
        'Require "name" and at least one size [{name, priceCents:number}]'
      );
    }
    for (const s of sizes) {
      if (!s?.name || typeof s?.priceCents !== "number") {
        return badRequest("Each size needs name and numeric priceCents");
      }
    }

    const item: MenuItem = {
      id: randomUUID(),
      name,
      category,
      sizes,
      isAvailable,
      tags,
      createdAt: new Date().toISOString(),
    };

    await getClient().send(
      new PutCommand({
        TableName: process.env.MENU_TABLE,
        Item: item,
        ConditionExpression: "attribute_not_exists(id)",
      })
    );

    return created(item);
  } catch (err) {
    console.error(err);
    return serverError();
  }
};
