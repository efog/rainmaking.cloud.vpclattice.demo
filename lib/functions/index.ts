
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";

/**
 * Lambda VPC Function Construct
 */
export class LambdaVpcFunctionConstruct extends Construct {
    private readonly _lambdaFunction: cdk.aws_lambda_nodejs.NodejsFunction;
    /**
     * Lambda Function
     */
    public get lambdaFunction(): lambda.IFunction {
        return this._lambdaFunction;
    }
    /**
     * Default constructor
     * @param scope The parent Construct
     * @param id The construct ID
     * @param props The stack properties
     * @param props.entry The Lambda function entry file
     * @param props.securityGroups The security groups to associate with the Lambda function
     * @param props.vpcSubnets The VPC subnets to deploy the Lambda function to
     * @param props.vpc The VPC to deploy the Lambda function to
     */
    constructor(scope: Construct, id: string, props: {
        entry: string,
        securityGroups?: ec2.ISecurityGroup[],
        vpc: ec2.IVpc
    } & cdk.StackProps) {
        super(scope, id);
        const vpc = props.vpc;
        // Create Lambda function
        this._lambdaFunction = new NodejsFunction(this, "LambdaFunction", {
            allowPublicSubnet: true,
            entry: props.entry,
            handler: "handler",
            runtime: lambda.Runtime.NODEJS_22_X,
            securityGroups: props.securityGroups,
            vpc: vpc
        });
    }
}
