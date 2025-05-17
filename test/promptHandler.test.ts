import { handler } from "../lambda/promptHandler/handler";

import {
  APIGatewayProxyEvent
} from "aws-lambda";

// Mock Bedrock and S3 clients
jest.mock("@aws-sdk/client-bedrock-runtime");
jest.mock("@aws-sdk/client-s3");

describe("Lambda handler", () => {
  it("returns 500 if clientQuestion is missing", async () => {
    const event = {
      body: JSON.stringify({}),
    } as APIGatewayProxyEvent;

    process.env.S3_BUCKET = "mock-bucket";
    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body).error).toBe("Internal Server Error");
  });
});