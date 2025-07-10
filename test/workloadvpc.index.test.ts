import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Template } from "aws-cdk-lib/assertions";
import { WorkloadsVpc } from "../lib/workloads-vpc/index";

describe("WorkloadsVpc", () => {
    let app: cdk.App;
    let stack: cdk.Stack;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, "TestStack");
    });

    test("creates VPC with default configuration", () => {
        new WorkloadsVpc(stack, "TestVpc");

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPC", {
            EnableDnsHostnames: true,
            EnableDnsSupport: true
        });
    });

    test("creates required VPC endpoints", () => {
        new WorkloadsVpc(stack, "TestVpc");

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        });
        template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        });
    });

    test("creates internet gateway when enabled", () => {
        new WorkloadsVpc(stack, "TestVpc", {
            enableInternetAccess: true,
            dynamoDBGatewayVpcEndpoint: false,
            ecrInterfaceVpcEndpoint: false,
            ecsInterfaceVpcEndpoint: false,
            s3GatewayVpcEndpoint: false
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::InternetGateway", {});
    });

    test("exposes vpc and albSubnets properties", () => {
        const workloadVpc = new WorkloadsVpc(stack, "TestVpc");

        expect(workloadVpc.vpc).toBeDefined();
        expect(workloadVpc.albSubnets).toBeDefined();
    });

    test("adds interface VPC endpoint", () => {
        const workloadVpc = new WorkloadsVpc(stack, "TestVpc");
        workloadVpc.addInterfaceVpcEndpoint(ec2.InterfaceVpcEndpointAwsService.LAMBDA);

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        });
    });
});