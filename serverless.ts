process.env.SLS_TS_NODE_IGNORE = "false";

import type { AWS } from "@serverless/typescript";

const stage = process.env.STAGE || "${sls:stage}";
const menuTable = `coffee-menu-${stage}`;

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
        Resource: [{ "Fn::GetAtt": ["MenuTable", "Arn"] }],
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
    },
  },
};

module.exports = config;
