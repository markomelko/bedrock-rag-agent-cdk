import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

import * as iam from "aws-cdk-lib/aws-iam";

import { addCorsOptions } from '../utils/cors-utils';

export class BedrockRagAgentCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // REST API Gateway to handle requests from the client
    const ragApi = new apigateway.RestApi(this, 'RagApi', {
      description: 'API to handle basic RAG requests and user responses',
    });

    // Resources for the ragApi
    const promptResource = ragApi.root.addResource('prompt');
    const inquiriesResource = ragApi.root.addResource('inquiries');

    // API Key protection for accessing the endpoint
    const apiKey = new apigateway.ApiKey(this, 'RagApiKey', {
      description: 'API Key to access the Rag API',
      enabled: true,
    });

    // S3 bucket used as a file-based knowledge base
    const documentBucket = new s3.Bucket(this, 'KnowledgeBaseBucket', {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // DynamoDB table to store user inquiries
    const inquiriesTable = new dynamodb.Table(this, 'InquiriesTable', {
      partitionKey: { name: 'inquiriesTimeStamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // or RETAIN for production
    });

    // DynamoDB to store FM responses as ModelResponses
    const modelResponsesTable = new dynamodb.Table(this, 'ModelResponsesTable', {
      partitionKey: { name: 'modelResponseId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // or RETAIN for production
    });

    // Lambda function to fetch knowledge from S3 and query Bedrock
    const promptHandler = new lambda.Function(this, 'PromptHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/promptHandler'),
      handler: 'handler.handler',
      environment: {
        S3_BUCKET: documentBucket.bucketName,
        MODEL_RESPONSES_TABLE: modelResponsesTable.tableName,
      },
    });

    // Lambda function to handle inquiries and store them to the DynamoDB
    const inquiriesHandler = new lambda.Function(this, 'InquiriesHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/inquiriesHandler'),
      handler: 'handler.handler',
      environment: {
        RESPONSE_TABLE: inquiriesTable.tableName,
      },
    });

    // Link API Gateway - Lambda function
    const promptIntegration = new apigateway.LambdaIntegration(promptHandler);
    const inquiriesIntegration = new apigateway.LambdaIntegration(inquiriesHandler);

    promptResource.addMethod('POST', promptIntegration, {
      apiKeyRequired: true,
    });

    inquiriesResource.addMethod('POST', inquiriesIntegration, {
      apiKeyRequired: true,
    });

    // Add CORS support for UI or cross-origin requests
    addCorsOptions(promptResource);
    addCorsOptions(inquiriesResource);

    // Define throttling and attach the API key to the usage plan, this is for all endpoints.
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
    documentBucket.grantRead(promptHandler);

    // Grant write access for Lambda to the DynamoDB inquiries table
    inquiriesTable.grantWriteData(inquiriesHandler);
    modelResponsesTable.grantWriteData(promptHandler);

    // Grant permissions for the Lambda function to invoke Bedrock models
    promptHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-premier-v1:0'
      ]
    }));
  }
}
