process.env.SLS_TS_NODE_IGNORE = "false";

import type { AWS } from "@serverless/typescript";

const stage = process.env.STAGE || "${sls:stage}";
const menuTable = `coffee-menu-${stage}`;
const ordersTable = `coffee-orders-${stage}`;

const config: AWS = {
  service: "coffee-shop-api",
  frameworkVersion: "3",
  plugins: ["serverless-plugin-typescript"],
  provider: {
    name: "aws",
    runtime: "nodejs20.x",
    region: "us-east-1",
    stage,
    logs: { httpApi: true },
    environment: {
      MENU_TABLE: menuTable,
      ORDERS_TABLE: ordersTable,
      TAX_RATE_PCT: "6.625", //philly tax; adjust as needed
      BEDROCK_MODEL_ID: "anthropic.claude-3-haiku-20240307-v1:0",
      AI_MAX_DOCS: "60",
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
    },
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Scan",
          "dynamodb:Query",
        ],
        Resource: [
          { "Fn::GetAtt": ["MenuTable", "Arn"] },
          { "Fn::GetAtt": ["OrdersTable", "Arn"] },
        ],
      },
      {
        Effect: "Allow",
        Action: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
        ],
        Resource: "*",
      },
    ],
  },
  functions: {
    healthz: {
      handler: "src/handlers/healthz.handler",
      events: [{ http: { path: "healthz", method: "get", cors: true } }],
    },
    menuCreate: {
      handler: "src/handlers/menu/create.handler",
      events: [{ http: { path: "menu-items", method: "post", cors: true } }],
    },
    menuList: {
      handler: "src/handlers/menu/list.handler",
      events: [{ http: { path: "menu-items", method: "get", cors: true } }],
    },
    menuGet: {
      handler: "src/handlers/menu/get.handler",
      events: [
        { http: { path: "menu-items/{id}", method: "get", cors: true } },
      ],
    },
    menuUpdate: {
      handler: "src/handlers/menu/update.handler",
      events: [
        { http: { path: "menu-items/{id}", method: "put", cors: true } },
      ],
    },
    menuDelete: {
      handler: "src/handlers/menu/remove.handler",
      events: [
        { http: { path: "menu-items/{id}", method: "delete", cors: true } },
      ],
    },
    orderCreate: {
      handler: "src/handlers/orders/create.handler",
      events: [{ http: { path: "orders", method: "post", cors: true } }],
    },
    orderList: {
      handler: "src/handlers/orders/list.handler",
      events: [{ http: { path: "orders", method: "get", cors: true } }],
    },
    orderGet: {
      handler: "src/handlers/orders/get.handler",
      events: [{ http: { path: "orders/{id}", method: "get", cors: true } }],
    },
    orderUpdate: {
      handler: "src/handlers/orders/update.handler",
      events: [{ http: { path: "orders/{id}", method: "put", cors: true } }],
    },
    orderDelete: {
      handler: "src/handlers/orders/remove.handler",
      events: [{ http: { path: "orders/{id}", method: "delete", cors: true } }],
    },
    aiSeachQuery: {
      handler: "src/handlers/ai/menuQuery.handler",
      events: [
        { http: { path: "ai/search-query", method: "post", cors: true } },
      ],
    },
  },
  resources: {
    Resources: {
      MenuTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: menuTable,
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
        },
      },
      OrdersTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: ordersTable,
          BillingMode: "PAY_PER_REQUEST",
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
        },
      },
    },
  },
};

module.exports = config;
