import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {

    const responseTable = process.env.RESPONSE_TABLE;

    if (!responseTable) {
      throw new Error("RESPONSE_TABLE environment variable is not set.");
    }

    // Parse the request body
    const body = JSON.parse(event.body || "{}");
    const respMsg = body.msg;
    const contactsInfo = body.contacts;

    // Return error resMsg or contactsInfo is not provided
    if (!respMsg || !contactsInfo) {
      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Credentials": "true"
        },
        body: JSON.stringify({
          error: "Please provide a response message and contacts information."
        })
      };
    }

    // There is data to store, store it in DynamoDB
    await client.send(new PutItemCommand({
      TableName: responseTable,
      Item: marshall({
        respTimeStamp: Date.now().toString(),
        contactsInfo,
        respMsg
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
        message: 'Response stored successfully',
      }),
    };

  } catch (err: any) {
    console.error("Application error:", err);
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