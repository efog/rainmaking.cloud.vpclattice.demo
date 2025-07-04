
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    return {
        statusCode: 200,
        body: JSON.stringify({})
    };
};