import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Template } from "aws-cdk-lib/assertions";
import { AppServer } from "../lib/appserver/index";

describe("AppServer", () => {
    let app: cdk.App;
    let stack: cdk.Stack;
    let vpc: ec2.IVpc;

    beforeEach(() => {
        app = new cdk.App();
        stack = new cdk.Stack(app, "TestStack");
        vpc = new ec2.Vpc(stack, "TestVpc");
    });

    test("creates ALB with correct configuration", () => {
        new AppServer(stack, "TestAppServer", { vpc });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
            Scheme: "internal",
            Type: "application"
        });
    });

    test("creates ECS cluster and service", () => {
        new AppServer(stack, "TestAppServer", { vpc });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::ECS::Cluster", {});
        template.hasResourceProperties("AWS::ECS::Service", {
            LaunchType: "FARGATE"
        });
    });

    test("creates security groups with correct rules", () => {
        new AppServer(stack, "TestAppServer", { vpc });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::SecurityGroup", {
            SecurityGroupIngress: [
                { IpProtocol: "tcp", FromPort: 443, ToPort: 443, CidrIp: "0.0.0.0/0" },
                { IpProtocol: "tcp", FromPort: 80, ToPort: 80, CidrIp: "0.0.0.0/0" }
            ]
        });
    });

    test("exposes ALB property", () => {
        const appServer = new AppServer(stack, "TestAppServer", { vpc });
        expect(appServer.alb).toBeDefined();
    });
});