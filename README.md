# bedrock-rag-agent-cdk

A reusable, CDK-defined AWS backend for creating Retrieval-Augmented Generation (RAG) based AI assistants using Amazon Bedrock and a Knowledge Base.

## 💡 Project goal

This project provides an API-based foundation for creating intelligent, role-based assistants (e.g. sales support, HR bots, knowledge assistants) that:

- Use AWS Bedrock and a foundation model (e.g. Claude)
- Include a Knowledge Base (e.g. from S3 documents)
- Are configurable via prompts and context
- Can be accessed via API Gateway

## 🧭 Architecture

![Arkkitehtuurikuva](./docs/idea-bedrock-rag-agent-cdk.jpg)



## 🧱 Components

- **API Gateway** – receives external requests, secured with API key
- **Lambda (TypeScript)** – builds the prompt and calls Bedrock
- **Amazon Bedrock** – generates answers using a foundation model
- **Knowledge Base (via S3)** – retrieves relevant document context
- **CloudWatch Logs** – for monitoring and debugging

## 🔐 Security

This project uses a generative foundation model via Amazon Bedrock, enhanced by a secure, external knowledge base (RAG architecture).

**The model does not learn from your data.** Content in the Knowledge Base is not used to train the foundation model. Amazon Bedrock guarantees that customer-provided documents remain private and are not shared, stored, or used for training any underlying model. For sensitive data use cases, configure S3 permissions, VPC access, and API security appropriately.

## 🚀 Getting Started

..coming soon

## 📌 Status

..coming soon

## 🚀 Configuration

..coming soon

## 📖 License

MIT – use and extend freely!