import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Template } from "aws-cdk-lib/assertions";
import { WorkloadVpc } from "../lib/workload-vpc/index";

describe("WorkloadVpc", () => {
    let app: cdk.App;
    let stack: cdk.Stack;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, "TestStack");
    });

    test("creates VPC with default configuration", () => {
        new WorkloadVpc(stack, "TestVpc");

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPC", {
            EnableDnsHostnames: true,
            EnableDnsSupport: true
        });
    });

    test("creates required VPC endpoints", () => {
        new WorkloadVpc(stack, "TestVpc");

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        });
        template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        });
    });

    test("creates internet gateway when enabled", () => {
        new WorkloadVpc(stack, "TestVpc", {
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
        const workloadVpc = new WorkloadVpc(stack, "TestVpc");

        expect(workloadVpc.vpc).toBeDefined();
        expect(workloadVpc.albSubnets).toBeDefined();
    });

    test("adds interface VPC endpoint", () => {
        const workloadVpc = new WorkloadVpc(stack, "TestVpc");
        workloadVpc.addInterfaceVpcEndpoint(ec2.InterfaceVpcEndpointAwsService.LAMBDA);

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPCEndpoint", {
        });
    });
});