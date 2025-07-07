import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { VpclatticedemoStack } from "../lib/vpclatticedemo-stack";

describe("VpclatticedemoStack", () => {
    let app: cdk.App;

    beforeEach(() => {
        app = new cdk.App();
    });

    test("creates VPC Lattice service network", () => {
        const stack = new VpclatticedemoStack(app, "TestStack", {
            env: {
                account: "123456789012",
                region: "ca-east-3"
            }
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::VpcLattice::ServiceNetwork", {});
    });

    test("creates Lambda function", () => {
        const stack = new VpclatticedemoStack(app, "TestStack", {
            env: {
                account: "123456789012",
                region: "ca-east-3"
            }
        });

        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::Lambda::Function", {
            Runtime: "nodejs22.x"
        });
    });

    test("creates ECS cluster and service", () => {
        const stack = new VpclatticedemoStack(app, "TestStack", {
            env: {
                account: "123456789012",
                region: "ca-east-3"
            }
        });
        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::ECS::Cluster", {});
        template.hasResourceProperties("AWS::ECS::Service", {});
    });

    test("creates VPC Lattice services", () => {
        const stack = new VpclatticedemoStack(app, "TestStack", {
            env: {
                account: "123456789012",
                region: "ca-east-3"
            }
        });
        const template = Template.fromStack(stack);
        template.resourceCountIs("AWS::VpcLattice::Service", 2);
    });

    test("creates workload VPC", () => {
        const stack = new VpclatticedemoStack(app, "TestStack", {
            env: {
                account: "123456789012",
                region: "ca-east-3"
            }
        });
        const template = Template.fromStack(stack);
        template.hasResourceProperties("AWS::EC2::VPC", {
            EnableDnsHostnames: true,
            EnableDnsSupport: true
        });
    });
});