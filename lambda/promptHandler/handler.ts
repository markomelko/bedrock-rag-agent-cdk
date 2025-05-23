import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from "@aws-sdk/client-bedrock-runtime";

import {
  S3Client,
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult
} from "aws-lambda";

import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";

const client = new DynamoDBClient({ region: "us-east-1" });

const region = "us-east-1";
const bedrock = new BedrockRuntimeClient({ region });
const s3 = new S3Client({ region });

// Utility: Convert S3 stream to string
function streamToString(stream: Readable): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Uint8Array[] = [];
    stream.on("data", chunk => chunks.push(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

/**
 * Lambda function to handle API Gateway requests
 * and interact with Bedrock Foundation Model.
 * Store the responses tp the DynamoDB.
 * @param event - API Gateway event
 * @returns 
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  const bucket = process.env.S3_BUCKET;
  const key = "profiledetails.txt"; // Could be dynamic based on the requests

  let clientQuestion = "";

  if (!bucket) {
    throw new Error("S3_BUCKET environment variable is not set.");
  }

  const modelResponsesTable = process.env.MODEL_RESPONSES_TABLE;

  if (!modelResponsesTable) {
    throw new Error("MODEL_RESPONSES_TABLE environment variable is not set.");
  }

  try {

    // Get profile content from S3
    const object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const profileContent = await streamToString(object.Body as Readable);

    // If the profile content is empty, return an error
    if (!profileContent) {
      throw new Error("Please upload a profile details file to the S3 bucket.");
    }

    // Parse the request body
    const body = JSON.parse(event.body || "{}");
    clientQuestion = body.clientQuestion;

    // If clientQuestion is not provided, return an error
    if (!clientQuestion) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Please provide a client question, make sure to validate UI input." }),
        headers: {
          "Content-Type": "application/json"
        }
      };
    }

    /**
     * Construct the full prompt for the model.
     * You can find more detailed info from the official documentation:
     * https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-text.html
     */

    const fullPrompt = `
    You are a helpful and friendly assistant specialized in HR topics.

    Your job is to help the person described in the PROFILE below find the best career opportunities and improve their chances of getting hired. You focus only on HR-related matters such as skills, roles, soft strengths, and career suggestions.

    If the question is unrelated to HR, simply reply: "I'm here to help with HR-related questions. Could you please ask something related to that?"

    Keep your answer warm, short, and professional.

    === PROFILE ===
    ${profileContent}

    === QUESTION ===
    ${clientQuestion}

    Answer:
    `;

    // Invoke the model with the constructed prompt
    const input = {
      modelId: "amazon.titan-text-premier-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: Buffer.from(JSON.stringify({
        inputText: fullPrompt,
        textGenerationConfig: {
          maxTokenCount: 1000,
          stopSequences: [],
          temperature: 0.8,
          topP: 0.9,
        }
      }))
    };

    // Send the request to the Bedrock model
    const response = await bedrock.send(new InvokeModelCommand(input));
    const rawOutput = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(rawOutput);
    const answer = parsed.results?.[0]?.outputText?.trim() || "No response from model.";
    const requestId = response?.$metadata?.requestId;

    if (!requestId) {
      throw new Error("No request ID found in the response.");
    }

    // Store the Question and answer in DynamoDB
    await client.send(new PutItemCommand({
      TableName: modelResponsesTable,
      Item: marshall({
        modelResponseId: Date.now().toString(),
        requestId,
        question: clientQuestion,
        answer,
        requestSuccess: true,
        visibleOnUI: false
      })
    }));

    // Return the response
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Credentials": "true"
      },
      body: JSON.stringify({ answer })
    };

  } catch (err: any) {
    console.error("RAG application error:", err);

    // Store failed request in DynamoDB for debugging and development purposes
    await client.send(new PutItemCommand({
      TableName: modelResponsesTable,
      Item: marshall({
        modelResponseId: Date.now().toString(),
        requestId: "error",
        question: clientQuestion,
        answer: "error",
        requestSuccess: false,
        visibleOnUI: false
      })
    }));

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        error: "Internal Server Error",
        detail: err?.message
      })
    };
  }
};