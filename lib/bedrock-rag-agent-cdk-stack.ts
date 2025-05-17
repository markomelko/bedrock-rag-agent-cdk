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

    // REST API Gateway to handle requests
    const ragApi = new apigateway.RestApi(this, 'RagApi', {
      description: 'API to handle basic RAG requests and user responses',
    });

    // Resources for the ragApi
    const promptResource = ragApi.root.addResource('prompt');
    const responseResource = ragApi.root.addResource('response'); // ** Optional **

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

    // ** Optional **
    // DynamoDB table to store user responses
    const responseTable = new dynamodb.Table(this, 'ResponseTable', {
      partitionKey: { name: 'respTimeStamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // or RETAIN for production
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

    // ** Optional **
    // Lambda function to handle responses and store them in DynamoDB
    const responseHandler = new lambda.Function(this, 'ResponseHandlerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset('lambda/responseHandler'),
      handler: 'handler.handler',
      environment: {
        RESPONSE_TABLE: responseTable.tableName,
      },
    });

    // Link API Gateway - Lambda function
    const promptIntegration = new apigateway.LambdaIntegration(requestHandler);
    const responseIntegration = new apigateway.LambdaIntegration(responseHandler); // ** Optional **

    promptResource.addMethod('POST', promptIntegration, {
      apiKeyRequired: true,
    });

    // ** Optional **
    responseResource.addMethod('POST', responseIntegration, {
      apiKeyRequired: true,
    });

    // Add CORS support for UI or cross-origin requests
    addCorsOptions(promptResource);
    addCorsOptions(responseResource); // ** Optional **

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
    documentBucket.grantRead(requestHandler);

    // ** Optional **
    // Grant write access for Lambda to the DynamoDB response table
    responseTable.grantWriteData(responseHandler);

    // Grant permissions for the Lambda function to invoke Bedrock models
    requestHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel'],
      resources: [
        'arn:aws:bedrock:us-east-1::foundation-model/amazon.titan-text-premier-v1:0'
      ]
    }));
  }
}
