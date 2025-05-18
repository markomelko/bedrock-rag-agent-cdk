import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

/**
 * Lambda handler to store response messages and contacts information in DynamoDB.
 * @param event 
 * @returns 
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const inquiriesTable = process.env.RESPONSE_TABLE;

    if (!inquiriesTable) {
      throw new Error("RESPONSE_TABLE environment variable is not set.");
    }

    // Parse the request body
    const body = JSON.parse(event.body || "{}");
    const userMessage = body.msg;
    const userContactsInfo = body.contacts;

    // Return error resMsg or contactsInfo is not provided
    if (!userMessage || !userContactsInfo) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true"
        },
        body: JSON.stringify({
          error: "Please provide a message and contacts information."
        })
      };
    }

    // There is data to store, store it in DynamoDB
    await client.send(new PutItemCommand({
      TableName: inquiriesTable,
      Item: marshall({
        inquiriesTimeStamp: Date.now().toString(),
        userContactsInfo,
        userMessage
      })
    }));

    // Return success response
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Message stored successfully',
      }),
    };

  } catch (err: any) {
    console.error("RAG application error:", err);
    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Internal Server Error",
      })
    };
  }
};