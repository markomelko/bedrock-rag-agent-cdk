import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import {
  DynamoDBClient,
  ScanCommand
} from "@aws-sdk/client-dynamodb";

import { unmarshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

/**
 * Lambda to get all the prompts from DynamoDB.
 * This is used to get the marked prompts for the UI.
 * @param event 
 * @returns 
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const modelResponsesTable = process.env.MODEL_RESPONSES_TABLE;

  if (!modelResponsesTable) {
    throw new Error("MODEL_RESPONSES_TABLE environment variable is not set.");
  }

  try {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const response = await client.send(
      new ScanCommand({
        TableName: modelResponsesTable,
        FilterExpression: "requestSuccess = :rs AND visibleOnUI = :vu",
        ExpressionAttributeValues: {
          ":rs": { BOOL: true },
          ":vu": { BOOL: true }
        }
      })
    );

    const items = response.Items?.map(item => unmarshall(item)) || [];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true"
      },
      body: JSON.stringify({ items })
    };

  } catch (err: any) {
    console.error("Error during DynamoDB scan:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true"
      },
      body: JSON.stringify({ error: "Internal server error" })
    };
  }
};
