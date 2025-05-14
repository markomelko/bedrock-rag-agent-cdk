import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';

import * as iam from "aws-cdk-lib/aws-iam";

import { addCorsOptions } from '../utils/cors-utils';


export class BedrockRagAgentCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // REST API for sending prompt requests to Bedrock
    const ragApi = new apigateway.RestApi(this, 'RagApi', {
      description: 'REST API to handle prompt requests for Bedrock RAG agent',
    });

    // Endpoint for sending user prompts (e.g., POST /prompt)
    const promptResource = ragApi.root.addResource('prompt');

    // API Key protection for accessing the endpoint
    const apiKey = new apigateway.ApiKey(this, 'RagApiKey', {
      description: 'API Key to access /prompt endpoint',
      enabled: true,
    });

    // S3 bucket used as a file-based knowledge base
    const documentBucket = new s3.Bucket(this, 'KnowledgeBaseBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN, // change to DESTROY for dev/demo use
    });

    // Lambda function to fetch knowledge from S3 and query Bedrock
    const requestHandler = new lambda.Function(this, 'PromptHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/promptHandler'),
      handler: 'handler.handler',
      environment: {
        S3_BUCKET: documentBucket.bucketName,
      },
    });

    // Link API Gateway - Lambda function
    const promptIntegration = new apigateway.LambdaIntegration(requestHandler);

    promptResource.addMethod('POST', promptIntegration, {
      apiKeyRequired: true,
    });

    // Add CORS support for UI or cross-origin requests
    addCorsOptions(promptResource);

    // Define throttling and attach the API key to the usage plan
    const usagePlan = ragApi.addUsagePlan('RagUsagePlan', {
      throttle: {
        rateLimit: 10,
        burstLimit: 10,
      },
      apiStages: [{
        api: ragApi,
        stage: ragApi.deploymentStage,
      }],
    });

    usagePlan.addApiKey(apiKey);

    // Grant read-only access for Lambda to the S3 knowledge base
    documentBucket.grantRead(requestHandler);

    requestHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        'arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0'
      ]
    }));
  }
}
