# bedrock-rag-agent-cdk

A reusable, AWS CDK-defined backend infra for creating (RAG) based AI assistants using Amazon Bedrock and a Knowledge Base. There will be just a API Gateway and a Lambda function that will call Bedrock. The Lambda function will be written in TypeScript and will use the AWS SDK to call Bedrock. The API Gateway will be secured with an API key.

## 💡 Project goal

Show how easy it is to create a RAG-based AI assistant using Amazon Bedrock and a Knowledge Base. The project will be reusable and can be used as a starting point for creating your own RAG-based AI assistants.

## 🧭 Architecture

![Arkkitehtuurikuva](./docs/idea-bedrock-rag-agent-cdk.jpg)

## 🧱 Components

- **API Gateway** – receives external requests, secured with API key
- **Lambda (TypeScript)** – builds the prompt and calls Bedrock
- **S3** – stores the knowledge base (e.g. CSV, JSON, etc.) 
- **Amazon Bedrock** – generates answers using a foundation model

## 🔐 Security

**The model does not learn from your data.** Content in the Knowledge Base is not used to train the foundation model. Amazon Bedrock guarantees that customer-provided documents remain private and are not shared, stored, or used for training any underlying model. For sensitive data use cases, configure S3 permissions, VPC access, and API security appropriately.

## 🚀 Getting Started

- Create an AWS account, make also sure you don't use ROOT user, because it's not a good practice
- If you have an existing AWS account, create IAM user to have programmatic access to AWS services
- Configure AWS CLI with your credentials ```aws configure```

## 📌 Status

..coming soon

## 🚀 Configuration

..coming soon

## 📖 License

MIT – use and extend freely!