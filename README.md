# AI Assistant with Amazon Bedrock and AWS CDK

A reusable, AWS CDK-defined backend infra for creating (RAG) based AI assistants using Amazon Bedrock and a Knowledge Base.

## Project goal

Show how to create a RAG-based AI assistant using Amazon Bedrock and a Knowledge Base. The project will be reusable and can be used as a starting point for creating your own RAG-based AI assistants.

## Architecture

![Arkkitehtuurikuva](./docs/idea-bedrock-rag-agent-cdk.jpg)

## Components

- **API Gateway** – receives external requests, secured with API key
- **Lambda (TypeScript)** – builds the prompt and calls Bedrock
- **S3** – stores the knowledge base (e.g. CSV, JSON, etc.) 
- **Amazon Bedrock** – generates answers using a selected foundation model
- **Amazon CloudFront** (optional) – serves the UI with HTTPS
- **S3 UI client** (optional) – hosts the UI

## Security

**The selected FM model does not learn from your data.** Content in the Knowledge Base is not used to train the foundation model. Amazon Bedrock guarantees that customer-provided documents remain private and are not shared, stored, or used for training any underlying model. For sensitive data use cases, configure S3 permissions, VPC access, and API security appropriately.

Just wanted to write that down, because I have seen some people being worried about the data privacy and security when using AI services generally.

## Getting Started

1. Create an AWS account, make also sure you don't use ROOT user, because it's not a good practice. This is maybe the bigges part of the setup, because you need to provide your credit card information. If you have an existing AWS account, create IAM user to have programmatic access to AWS services
2. Install AWS CLI if you don't have it already. You can find the installation instructions [here](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html). You can use Homebrew too if you are on MacOS: ```brew install awscli```
3. Configure AWS CLI with your credentials ```aws configure``` 
4. ..
5. ..

## In Progress

### Basic infra

- [x] 1. Create empty AWS CDK project
- [ ] 2. Create empty Lambda function that responds with "Hello World"
- [ ] 3. Create API Gateway endpoint with API key protection
- [ ] 4. Test API Gateway with Postman

### Knowledge base and S3

- [ ] 5. Create S3 bucket for knowledge base markdown documents
- [ ] 6. Allow Lambda to access S3 bucket and fetch documents
- [ ] 7. Plan logic for selecting topic-based document (e.g. "your-skills.md")

### Bedrock-integration

- [ ] 8. Create Lambda logic to call Bedrock Claude with constructed prompt
- [ ] 9. Test Bedrock-powered Lambda with real markdown content via Postman
- [ ] 10. Add environment variables (model ID, bucket name, etc.)

### Testing and scaling

- [ ] 11. Add support for `topic` and `language` in request payload
- [ ] 12. Test multiple topics and multilingual responses
- [ ] 13. Add fallback/error response handling

### UI

- [ ] 14. Create lightweight React UI for asking questions
- [ ] 15. Add selection for topic and response language in UI
- [ ] 16. Host UI in S3 static website
- [ ] 17. Serve UI through CloudFront with HTTPS (optional)

### Docs

- [ ] 18. Draw architecture diagram (e.g. draw.io)
- [ ] 19. Add architecture image to README
- [ ] 20. Add usage instructions (API usage + UI usage)



## Configuration

..coming soon

## License

MIT – use and extend freely!