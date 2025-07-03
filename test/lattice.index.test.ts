import { App, Stack } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { Vpc, IVpc } from "aws-cdk-lib/aws-ec2";
import { ApplicationLoadBalancer } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Lattice } from "../lib/lattice";

describe("Lattice Construct", () => {
    let app: App;
    let stack: Stack;
    let vpc: IVpc;
    let alb: ApplicationLoadBalancer;
    let hostedZone: HostedZone;

    beforeEach(() => {
        app = new App();
        stack = new Stack(app, "TestStack");
        vpc = new Vpc(stack, "TestVpc");
        alb = new ApplicationLoadBalancer(stack, "TestALB", { vpc });
        hostedZone = new HostedZone(stack, "TestZone", { zoneName: "example.com" });
    });

    describe("Constructor", () => {
        test("creates service network with sharing enabled", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            expect(lattice).toBeDefined();
        });
    });

    describe("associateVpc", () => {
        test("creates VPC association with correct properties", () => {
            const lattice = new Lattice(stack, "TestLattice",  {});
            lattice.associateVpc(vpc, "TestAssociation");

            const template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::VpcLattice::ServiceNetworkVpcAssociation", {
                VpcIdentifier: Match.anyValue(),
                ServiceNetworkIdentifier: Match.anyValue()
            });
        });

        test("returns VPC association construct", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            const association = lattice.associateVpc(vpc, "TestAssociation");
      
            expect(association).toBeDefined();
            expect(association.vpcIdentifier).toBe(vpc.vpcId);
        });
    });

    describe("createAlbLatticeService", () => {
        test("creates service without certificate when no custom domain", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                enableAccessLogs: false,
                serviceName: "test-service"
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::VpcLattice::Service", {
                AuthType: "NONE"
            });
            template.hasResourceProperties("AWS::VpcLattice::Service", 
                Match.not({ CertificateArn: Match.anyValue() })
            );
        });

        test("creates service with new certificate when custom domain provided", () => {
            const lattice = new Lattice(stack, "TestLattice",  {});
            lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                customDomainName: "service.example.com",
                enableAccessLogs: false,
                hostedZone,
                serviceName: "test-service"
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::CertificateManager::Certificate", {
                DomainName: "service.example.com"
            });
            template.hasResourceProperties("AWS::VpcLattice::Service", {
                CustomDomainName: "service.example.com"
            });
        });

        test("creates service with existing certificate when ARN provided", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            const certArn = "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012";
      
            lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                certificateArn: certArn,
                customDomainName: "service.example.com",
                enableAccessLogs: false,
                serviceName: "test-service"
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::VpcLattice::Service", {
                CertificateArn: certArn,
                CustomDomainName: "service.example.com"
            });
        });

        test("creates target group with HTTPS configuration", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                enableAccessLogs: false,
                serviceName: "test-service"
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::VpcLattice::TargetGroup", {
                Type: "ALB",
                Targets: [{ Id: Match.anyValue(), Port: 443 }],
                Config: {
                    Port: 443,
                    Protocol: "HTTPS",
                    VpcIdentifier: Match.anyValue()
                }
            });
        });

        test("creates HTTPS listener with correct configuration", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                enableAccessLogs: false,
                serviceName: "test-service"
            });

            const template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::VpcLattice::Listener", {
                Protocol: "HTTPS",
                Port: 443,
                DefaultAction: {
                    Forward: {
                        TargetGroups: [{
                            TargetGroupIdentifier: Match.anyValue(),
                            Weight: 100
                        }]
                    }
                }
            });
        });

        test("creates DNS alias record when custom domain and hosted zone provided", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                customDomainName: "service.example.com",
                enableAccessLogs: false,
                hostedZone,
                serviceName: "test-service"
            });

            expect(lattice).toBeDefined();
        });

        test("does not create DNS record when hosted zone not provided", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                customDomainName: "service.example.com",
                enableAccessLogs: false,
                serviceName: "test-service"
            });

            const template = Template.fromStack(stack);
            template.resourceCountIs("AWS::Route53::RecordSet", 0);
        });

        test("returns service construct", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            const service = lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                enableAccessLogs: false,
                serviceName: "test-service"
            });

            expect(service).toBeDefined();
            expect(service.authType).toBe("NONE");
        });
    });

    describe("associateService", () => {
        test("creates service network service association", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            const service = lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                enableAccessLogs: false,
                serviceName: "test-service"
            });
            lattice.associateService(service, "TestServiceAssociation");

            const template = Template.fromStack(stack);
            template.hasResourceProperties("AWS::VpcLattice::ServiceNetworkServiceAssociation", {
                ServiceIdentifier: Match.anyValue(),
                ServiceNetworkIdentifier: Match.anyValue()
            });
        });

        test("returns service association construct", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
            const service = lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                enableAccessLogs: false,
                serviceName: "test-service"
            });
            const association = lattice.associateService(service, "TestServiceAssociation");

            expect(association).toBeDefined();
            expect(association.serviceIdentifier).toBe(service.attrId);
        });
    });

    describe("Integration Tests", () => {
        test("creates complete lattice setup with VPC and service associations", () => {
            const lattice = new Lattice(stack, "TestLattice", {});
      
            // Associate VPC
            lattice.associateVpc(vpc, "TestVpcAssociation");
      
            // Create service
            const service = lattice.createAlbLatticeService({
                applicationLoadBalancer: alb,
                customDomainName: "service.example.com",
                enableAccessLogs: true,
                hostedZone,
                serviceName: "test-service"
            });
      
            // Associate service
            lattice.associateService(service, "TestServiceAssociation");

            const template = Template.fromStack(stack);
      
            // Verify all resources are created
            template.resourceCountIs("AWS::VpcLattice::ServiceNetwork", 1);
            template.resourceCountIs("AWS::VpcLattice::ServiceNetworkVpcAssociation", 1);
            template.resourceCountIs("AWS::VpcLattice::Service", 1);
            template.resourceCountIs("AWS::VpcLattice::TargetGroup", 1);
            template.resourceCountIs("AWS::VpcLattice::Listener", 1);
            template.resourceCountIs("AWS::VpcLattice::ServiceNetworkServiceAssociation", 1);
            template.resourceCountIs("AWS::CertificateManager::Certificate", 1);
            template.resourceCountIs("AWS::Route53::RecordSet", 1);
        });
    });
});