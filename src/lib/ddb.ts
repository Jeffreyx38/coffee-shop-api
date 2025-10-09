import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

let ddbDoc: DynamoDBDocumentClient;

export const getClient = () => {
  if (!ddbDoc) {
    const ddb = new DynamoDBClient({});
    ddbDoc = DynamoDBDocumentClient.from(ddb, {
      marshallOptions: { removeUndefinedValues: true }
    });
  }
  return ddbDoc;
};
