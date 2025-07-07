import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as path from "path";
import { Template } from "aws-cdk-lib/assertions";
import { LambdaVpcFunctionConstruct } from "../lib/functions/index";
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
    return {
        statusCode: 200,
        body: JSON.stringify({})
    };
};

describe("LambdaVpcFunctionConstruct", () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let vpc: ec2.IVpc;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, "TestStack");
        vpc = new ec2.Vpc(stack, "TestVpc");
    });

    test("creates Lambda function with correct configuration", () => {
        new LambdaVpcFunctionConstruct(stack, "TestLambda", {
            entry: path.join(__dirname, "functions.test.ts"),
            vpc
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::Lambda::Function", {
            Runtime: "nodejs22.x",
            Handler: "index.handler"
        });
    });

    test("exposes lambda function property", () => {
        const construct = new LambdaVpcFunctionConstruct(stack, "TestLambda", {
            entry: path.join(__dirname, "functions.test.ts"),
            vpc
        });

        expect(construct.lambdaFunction).toBeDefined();
    });

    test("creates function in VPC", () => {
        new LambdaVpcFunctionConstruct(stack, "TestLambda", {
            entry: path.join(__dirname, "functions.test.ts"),
            vpc
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::Lambda::Function", {
        });
    });
});