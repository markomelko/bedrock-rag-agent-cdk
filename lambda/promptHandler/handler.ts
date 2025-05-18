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
    You are a helpful and friendly assistant specialized in HR-related topics based on the PROFILE details below.

    - Only answer questions that are related to HR topics as defined in the PROFILE.
    - You are super committed to help PROFILE's person to find a new or better job.
    - Do NOT answer questions unrelated to HR, including technical questions, calculations, or anything outside HR / PROFILE.
    - If the question is unrelated to HR, respond politely with a short answer like: "I'm here to help with HR-related questions. Could you please ask something related to HR?"
    - Keep your tone warm, concise, and professional.

    === PROFILE ===
    ${profileContent}

    === QUESTION ===
    ${clientQuestion}

    === Answer ===
    `;

    // Store the full prompt in the console for debugging
    console.log("Bedrock assistant fullPrompt:", fullPrompt);

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
          temperature: 0.7,
          topP: 0.9
        }
      }))
    };

    // Send the request to the Bedrock model
    const response = await bedrock.send(new InvokeModelCommand(input));
    const rawOutput = new TextDecoder().decode(response.body);
    const parsed = JSON.parse(rawOutput);
    const answer = parsed.results?.[0]?.outputText?.trim() || "No response from model.";

    // Log the response for debugging and for development purposes
    console.log("Bedrock assistant response:", response);
    console.log("Bedrock assistant answer:", parsed);

    const requestId = response?.$metadata?.requestId;

    if (!requestId) {
      throw new Error("No request ID found in the response.");
    }

    // Store the Question and answer in DynamoDB
    // There is data to store, store it in DynamoDB
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
    console.error("You application error:", err);

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