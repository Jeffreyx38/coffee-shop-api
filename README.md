# Coffee Shop APIs

Serverless REST API for a coffee shop. Two domains:

- Menu – CRUD for menu items (sizes, prices, availability)
- Orders – create orders from menu items, price in integer cents, compute tax, enforce status transitions

Stack: API Gateway (REST) → Lambda (Node.js 20 + TypeScript) → DynamoDB
IaC: Serverless Framework v3 (serverless.ts)
CI/CD: GitHub Actions + AWS OIDC (no long-lived AWS keys)

## Quick Start:

### Prereqs

- Node.js (latest)
- AWS CLI authenticated (aws configure or aws sso login)
- Permissions to create CloudFormation, Lambda, API Gateway, DynamoDB, IAM roles for the stack

### Install

```
npm install
```

### Deploy (dev)

```
npx sls deploy --stage dev
```

### Deploy (prod)

```
npx sls deploy --stage prod
```

At the end you’ll see base URLs like:

GET - https://<api-id>.execute-api.us-east-1.amazonaws.com/dev/healthz

POST - https://<api-id>.execute-api.us-east-1.amazonaws.com/dev/menu-items

## Data Models

### MenuItem

```
{
  "id": "uuid",
  "name": "Latte",
  "category": "espresso",
  "sizes": [ { "name": "small", "priceCents": 425 } ],
  "isAvailable": true,
  "tags": ["hot","milk"],
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601?"
}

```

### Order

```
{
  "id": "uuid",
  "customer": { "name": "Ava", "phone": "optional" },
  "items": [
    { "menuItemId": "uuid", "size": "small", "qty": 2, "unitPriceCents": 425, "lineTotalCents": 850 }
  ],
  "subtotalCents": 850,
  "taxCents": 56,
  "totalCents": 906,
  "status": "PLACED | PAID | PREPARING | READY | PICKED_UP | CANCELLED",
  "createdAt": "ISO-8601",
  "updatedAt": "ISO-8601?"
}


```

## Endpoints

# Health

- GET /healthz → 200

# Menu

- POST /menu-items

- GET /menu-items

- GET /menu-items/{id}

- PUT /menu-items/{id}

- DELETE /menu-items/{id}

# Orders

- POST /orders

- GET /orders

- GET /orders/{id}

- PUT /orders/{id}

- DELETE /orders/{id}

### Error model

400 bad request (validation/transition), 404 not found, 500 server error.
Consistent JSON errors: { "error": "bad_request", "message": "..." }.

# BONUS: AI Search (Bedrock)

A small AI-powered endpoint that answers custom questions about your Menu using Amazon Bedrock (default: Claude 3 Haiku). It reads a compact snapshot of your coffee-menu-${stage} table (capped by AI_MAX_DOCS) and returns a short answer.

- Endpoint: POST /ai/search-query
- Input: { "question": "string" }
- Output: { "answer": "string", "meta": { "model": "...", "itemsConsidered": n, "maxDocs": n } }
- guards: If the Menu table is empty → returns: {"answer":"No menu items found. Add items to the menu and try again.", ...}

## Prereqs

Enable model access in AWS Bedrock Console → Model access → allow Claude 3 Haiku. Submit model use case details.

Otherwise, you'll get error:

```
ResourceNotFoundException: Model use case details have not been submitted for this account. Fill out the Anthropic use case details form before using the model. If you have already filled out the form, try again in 15 minutes.
```

Install runtime SDK (included in package.json already):

```
npm i @aws-sdk/client-bedrock-runtime
```

## Example requests:

Ask a general question:

```
{
  "question": "What is the general price range and name two items from the context?"
}
```

Ask about availability & sizes:

```
{
  "question": "List a few available items and mention their sizes briefly."
}
```

Empty table behavior:

```
{
  "answer": "No menu items found. Add items to the menu and try again.",
  "meta": { "itemsConsidered": 0, "maxDocs": 60 }
}

```

## Test

Postman collection json included.

## CI/CD (GitHub Actions + OIDC)

1. AWS IAM

- OIDC provider: token.actions.githubusercontent.com (audience sts.amazonaws.com)
- Role coffee-ci-prod with trust on your repo/branch (sub = repo:ORG/REPO:ref:refs/heads/main)
- Policy allows CloudFormation, Lambda, API Gateway, DynamoDB, Logs (scope to stack ARNs when convenient)

2. GitHub → Settings → Environments → prod

- Secret AWS_ROLE_ARN = the role ARN above

3. Workflow (.github/workflows/deploy-prod.yml)

## Design Decisions

- Two DynamoDB tables (Menu / Orders) for clarity & least-surprise IAM
- Integer-cents for money (avoid float drift)

## Future Work

TBD
