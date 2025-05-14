import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log("Event: ", JSON.stringify(event, null, 2));
  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': 'true',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: "Hello from Lambda!",
      event,
    }),
  };
  return response;
};
