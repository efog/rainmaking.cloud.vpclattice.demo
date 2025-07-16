import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { WorkloadsVpc } from "../lib/workloads-vpc/index";
import { InterfaceVpcEndpointAwsService } from "aws-cdk-lib/aws-ec2";

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
        new WorkloadsVpc(stack, "TestVpc", {
            enableInternetAccess: false,
            interfaceEndpoints: [InterfaceVpcEndpointAwsService.ACCESS_ANALYZER]
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        });
    });

    test("creates internet gateway when enabled", () => {
        new WorkloadsVpc(stack, "TestVpc", {
            enableInternetAccess: true
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::InternetGateway", {});
    });

    test("exposes vpc and privateSubnetsWithEgress properties", () => {
        const workloadVpc = new WorkloadsVpc(stack, "TestVpc");

        expect(workloadVpc.vpc).toBeDefined();
        expect(workloadVpc.privateSubnetsWithEgress).toBeDefined();
    });
});