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

const bedrock = new BedrockRuntimeClient({ region: "us-east-1" });
const s3 = new S3Client({ region: "us-east-1" });

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

  try {

    console.log("Event: ", JSON.stringify(event, null, 2));

    // Check if the event body is present
    const demoEventBody = {
      question: "What is the capital of France?",
      topic: "Geography",
    };

    // Simulate a POST request with the demo event body
    const stringifiedEvent = {
      body: JSON.stringify(demoEventBody),
    };

    const { question, topic } = JSON.parse(stringifiedEvent.body || "{}");

    if (!question || !topic) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing 'question' or 'topic' in body." })
      };
    }

    // Create demo contextText
    const contextText = `Konteksti: ${topic} - Tämä on esimerkkikonteksti, joka liittyy aiheeseen ${topic}.`;

    const prompt = `Tietopohja:\n\n${contextText}\n\nKäyttäjän kysymys:\n${question}`;

    const input = {
      modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Toimi asiantuntevana teknisenä neuvonantajana, joka antaa tiiviitä, mutta selkeitä vastauksia.\n\n${prompt}`
              }
            ]
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        top_p: 0.95
      })
    };


    const response = await bedrock.send(new InvokeModelCommand(input));

    const responseJson = JSON.parse(
      new TextDecoder().decode(response.body)
    );

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        answer: responseJson?.content?.[0]?.text?.trim() || "No answer received"
      })
    };
  } catch (err: any) {
    console.error("Error: ", err);
    return {
      statusCode: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ error: "Internal Server Error" })
    };
  }
};
