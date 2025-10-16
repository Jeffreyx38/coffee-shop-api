import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { badRequest, created, serverError } from "../../utils/http";
import { randomUUID } from "crypto";

type MenuSize = { name: string; priceCents: number };
type MenuItem = {
  id: string;
  name: string;
  sizes: MenuSize[];
  isAvailable: boolean;
};

type OrderItemReq = { menuItemId: string; size: string; qty: number };
type OrderItem = OrderItemReq & {
  unitPriceCents: number;
  lineTotalCents: number;
};
type OrderStatus =
  | "PLACED"
  | "PAID"
  | "PREPARING"
  | "READY"
  | "PICKED_UP"
  | "CANCELLED";

type Order = {
  id: string;
  customer?: { name: string; phone?: string };
  items: OrderItem[];
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
};

const toTaxCents = (subtotalCents: number) => {
  const rate = Number(process.env.TAX_RATE_PCT || "0");
  return Math.round(subtotalCents * (rate / 100));
};

const fetchMenuItem = async (id: string): Promise<MenuItem | undefined> => {
  const out = await getClient().send(
    new GetCommand({ TableName: process.env.MENU_TABLE, Key: { id } })
  );
  return out.Item as MenuItem | undefined;
};

export const handler = async (event: any) => {
  try {
    if (!event.body) return badRequest("Missing body");
    const { customer, items } = JSON.parse(event.body) as {
      customer?: any;
      items: OrderItemReq[];
    };
    if (!Array.isArray(items) || items.length === 0)
      return badRequest("Provide at least one item");

    const priced: OrderItem[] = [];
    let subtotal = 0;

    for (const req of items) {
      if (
        !req.menuItemId ||
        !req.size ||
        !Number.isFinite(req.qty) ||
        req.qty <= 0
      ) {
        return badRequest("Each item needs { menuItemId, size, qty>0 }");
      }
      const menu = await fetchMenuItem(req.menuItemId);
      if (!menu || !menu.isAvailable)
        return badRequest(`Unavailable item: ${req.menuItemId}`);

      const size = menu.sizes.find((s) => s.name === req.size);
      if (!size)
        return badRequest(`Size not found for ${menu.name}: ${req.size}`);

      const unit = size.priceCents;
      const line = unit * req.qty;
      subtotal += line;
      priced.push({ ...req, unitPriceCents: unit, lineTotalCents: line });
    }

    const tax = toTaxCents(subtotal);
    const total = subtotal + tax;

    const order: Order = {
      id: randomUUID(),
      customer,
      items: priced,
      subtotalCents: subtotal,
      taxCents: tax,
      totalCents: total,
      status: "PLACED",
      createdAt: new Date().toISOString(),
    };

    await getClient().send(
      new PutCommand({
        TableName: process.env.ORDERS_TABLE,
        Item: order,
        ConditionExpression: "attribute_not_exists(id)",
      })
    );

    return created(order);
  } catch (e) {
    console.error(e);
    return serverError();
  }
};
