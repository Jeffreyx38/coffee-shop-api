process.env.SLS_TS_NODE_IGNORE = 'false';

import type { AWS } from '@serverless/typescript';

const stage = process.env.STAGE || '${sls:stage}';
const menuTable = `coffee-menu-${stage}`;

const config: AWS = {
  service: 'coffee-shop-api',
  frameworkVersion: '3',
  plugins: ['serverless-plugin-typescript'],
  provider: {
    name: 'aws',
    runtime: 'nodejs20.x',
    region: 'us-east-1',
    stage,
    logs: { httpApi: true },
    environment: {
      MENU_TABLE: menuTable,
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1'
    }
  },
  functions: {
    healthz: {
      handler: 'src/handlers/healthz.handler',
      events: [{ http: { path: 'healthz', method: 'get', cors: true } }]
    }
  }
};

module.exports = config;
