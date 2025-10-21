import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { getClient } from "../../lib/ddb";
import { badRequest, ok, serverError } from "../../utils/http";
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";

const td = new TextDecoder();

const MODEL_ID =
  process.env.BEDROCK_MODEL_ID || "anthropic.claude-3-haiku-20240307";
const MAX_DOCS = Math.max(
  10,
  Math.min(Number(process.env.AI_MAX_DOCS || "60"), 200)
);
const bedrock = new BedrockRuntimeClient({});

type MenuSize = { name: string; priceCents: number };
type MenuItem = {
  id: string;
  name: string;
  category?: string;
  sizes: MenuSize[];
  isAvailable: boolean;
  tags?: string[];
};

function toUSD(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

async function readMenuSample() {
  const ddb = getClient();
  const out = await ddb.send(
    new ScanCommand({
      TableName: process.env.MENU_TABLE,
      Limit: MAX_DOCS,
    })
  );
  return (out.Items || []) as MenuItem[];
}

function buildCompactContext(items: MenuItem[]) {
  const lines = items.slice(0, MAX_DOCS).map((m) => {
    const prices = (m.sizes || [])
      .map((s) => `${s.name}:${toUSD(s.priceCents)}`)
      .join("/");
    const avail = m.isAvailable ? "" : "(unavailable)";
    return `${m.name}${
      m.category ? `(${m.category})` : ""
    } [${prices}] ${avail}`.trim();
  });
  return `MENU SNAPSHOT (first ${lines.length}):\n${lines.join("\n")}\n`;
}

async function askClaude(system: string, user: string) {
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 300,
    temperature: 0.1, // keep it conservative
    system,
    messages: [{ role: "user", content: [{ type: "text", text: user }] }],
  });

  const resp = await bedrock.send(
    new InvokeModelCommand({
      modelId: MODEL_ID,
      contentType: "application/json",
      accept: "application/json",
      body,
    })
  );

  const text = td.decode(resp.body);
  const parsed = JSON.parse(text);
  return parsed?.content?.[0]?.text ?? "";
}

export const handler = async (event: any) => {
  try {
    const { question } = JSON.parse(event.body || "{}") as {
      question?: string;
    };
    if (!question || typeof question !== "string") {
      return badRequest("Provide a 'question' string in the body.");
    }

    const items = await readMenuSample();
    const total = items.length;

    //if no menu items, do NOT call the model
    if (total === 0) {
      return ok({
        answer: "No menu items found. Add items to the menu and try again.",
        meta: {
          model: MODEL_ID,
          itemsConsidered: 0,
          maxDocs: MAX_DOCS,
        },
      });
    }

    const context = buildCompactContext(items);

    console.log(context);

    //tell the model to refuse if context lacks info
    const system =
      "You are a concise assistant for a coffee shop menu. ONLY use the given CONTEXT. " +
      "If the context lacks sufficient information to answer, reply exactly: 'Insufficient menu data to answer.'";

    const user = `CONTEXT:\n${context}\n\nQUESTION:\n${question}`;

    const answer = await askClaude(system, user);

    return ok({
      answer,
      meta: { model: MODEL_ID, itemsConsidered: total, maxDocs: MAX_DOCS },
    });
  } catch (e) {
    console.error(e);
    return serverError("AI menu query failed");
  }
};
