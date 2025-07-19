
import * as cdk from "aws-cdk-lib";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import { Construct } from "constructs";
import { InterfaceVpcEndpointAwsService, IVpc } from "aws-cdk-lib/aws-ec2";
import { CnameRecord, IHostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { LogGroup } from "aws-cdk-lib/aws-logs";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";
import { WorkloadsVpc } from "../workloads-vpc";

/**
 * Lattice construct
 */
export class Lattice extends Construct {

    private readonly _serviceNetwork: cdk.aws_vpclattice.CfnServiceNetwork;
    private _servicesVpc?: WorkloadsVpc;
    private _latticeServiceLogGroup: cdk.aws_logs.ILogGroup;
    private _latticeServiceNetworkLogGroup: cdk.aws_logs.ILogGroup;

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props: {
        enableAccessLogs?: boolean,
        createServicesVpc?: boolean
    } & cdk.StackProps) {
        super(scope, id);
        this._serviceNetwork = new vpclattice.CfnServiceNetwork(this, "ServiceNetwork", {
            sharingConfig: {
                enabled: true
            } as cdk.aws_vpclattice.CfnServiceNetwork.SharingConfigProperty
        } as vpclattice.CfnServiceNetworkProps);
        if (props.enableAccessLogs) {
            this._latticeServiceNetworkLogGroup = new LogGroup(this, `${this.node.id}-lattice-servicenetwork-log-group`, {
                retention: 1
            });
            new vpclattice.CfnAccessLogSubscription(this, "ServiceNetworkAccessLogSubscription", {
                destinationArn: this._latticeServiceNetworkLogGroup.logGroupArn,
                resourceIdentifier: this._serviceNetwork.attrArn
            });
        }
        if (props.createServicesVpc) {
            this.scaffoldServicesVpc({
                interfaceEndpoints: [
                    InterfaceVpcEndpointAwsService.ECR,
                    InterfaceVpcEndpointAwsService.ECR_DOCKER,
                    InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
                    InterfaceVpcEndpointAwsService.CLOUDWATCH_MONITORING,
                    InterfaceVpcEndpointAwsService.ECS
                ]
            });
        }
    }

    scaffoldServicesVpc(props: { interfaceEndpoints?: InterfaceVpcEndpointAwsService[] }) {
        this._servicesVpc = new WorkloadsVpc(this, "EndpointsVpc", Object.assign({
        }, {
            enableInternetAccess: false,
            interfaceEndpoints: props.interfaceEndpoints
        }));

        // Create Resource Gateway
        const resourceGateway = new vpclattice.CfnResourceGateway(this, "ResourceGateway", {
            name: "awsservices-resource-gateway",
            subnetIds: this._servicesVpc.privateSubnetsWithEgress.subnetIds,
            vpcIdentifier: this._servicesVpc.vpc.vpcId
        });

        for (let index = 0; index < props.interfaceEndpoints!.length; index++) {
            const element = props.interfaceEndpoints![index];
            new vpclattice.CfnResourceConfiguration(this, `${element.shortName}InterfaceVpceResourceConfig`, {
                allowAssociationToSharableServiceNetwork: true,
                name: `${element.shortName}InterfaceVpceResourceConfig`,
                resourceConfigurationType: "SINGLE",
                portRanges: ["443"],
                resourceConfigurationAuthType: "NONE",
                resourceConfigurationDefinition: {
                    ipResource: "192.168.1.1"
                } as unknown as undefined,
                resourceGatewayId: resourceGateway.attrId
            });
        }
    }

    /**
     * Associates a VPC with the service network
     * @param vpcId The VPC ID
     */
    public associateVpc(vpc: IVpc, associationName: string, securityGroupIds: string[] = []): vpclattice.CfnServiceNetworkVpcAssociation {
        const targetVpc = vpc;

        // Create default security group for the VPC association
        const securityGroup = new cdk.aws_ec2.SecurityGroup(this, `${associationName}SecurityGroup`, {
            vpc: targetVpc,
            allowAllOutbound: true,
            description: "Default security group for VPC Lattice association"
        });
        securityGroup.addIngressRule(
            cdk.aws_ec2.Peer.ipv4(targetVpc.vpcCidrBlock),
            cdk.aws_ec2.Port.allTcp(),
            "Allow traffic from VPC"
        );
        return new vpclattice.CfnServiceNetworkVpcAssociation(this, `ServiceNetworkVpcAssociation${associationName}`, {
            vpcIdentifier: targetVpc.vpcId,
            serviceNetworkIdentifier: this._serviceNetwork.attrId,
            securityGroupIds: [...securityGroupIds, securityGroup.securityGroupId]
        });
    }

    /**
     * Creates a VPC Lattice service targetting a Lambda function
     * @param props The service properties
     * @returns The VPC Lattice service
     */
    createLambdaLatticeService(props: {
        authType?: string;
        certificateArn?: string,
        customDomainName?: string, // e.g. latticeservice.rainmaking.cloud.
        handler: cdk.aws_lambda.IFunction;
        hostedZone?: IHostedZone, // e.g. rainmaking.cloud.
        iamPolicyStatements?: PolicyStatement[]
        serviceName: string;
    }): vpclattice.CfnService {

        const serviceCertificate = props.customDomainName && props.certificateArn ? Certificate.fromCertificateArn(this, `${props.serviceName}-acm-certificate`, props.certificateArn)
            : props.customDomainName ? new Certificate(this, `${props.serviceName}-acm-construct-certificate`, {
                domainName: props.customDomainName,
                validation: CertificateValidation.fromDns(props.hostedZone)
            }) : null;

        const service = new vpclattice.CfnService(this, `${props.serviceName}-service`, {
            authType: !props.authType ? "NONE" : props.authType!,
            certificateArn: serviceCertificate && serviceCertificate.certificateArn || undefined,
            customDomainName: props.customDomainName,
            name: `${props.serviceName}-service`
        });

        // Minimal auth policy allowing access
        if (props.authType && props.authType === "AWS_IAM") {
            new vpclattice.CfnAuthPolicy(this, `${props.serviceName}-auth-policy`, {
                resourceIdentifier: service.attrArn,
                policy: {
                    Version: "2012-10-17",
                    Statement: props.iamPolicyStatements ? props.iamPolicyStatements : [{
                        Effect: "Allow",
                        Principal: "*",
                        Action: "vpc-lattice-svcs:Invoke",
                        Resource: "*"
                    }]
                }
            });
        }

        // Create VPC Lattice Target Group for Lambda
        const targetGroup = new vpclattice.CfnTargetGroup(this, `${props.serviceName}-target-group`, {
            type: "LAMBDA",
            targets: [{
                id: props.handler.functionArn
            }]
        });

        // Create VPC Lattice Listener
        new vpclattice.CfnListener(this, `${props.serviceName}-listener`, {
            serviceIdentifier: service.attrId,
            protocol: "HTTPS",
            port: 443,
            defaultAction: {
                forward: {
                    targetGroups: [{
                        targetGroupIdentifier: targetGroup.attrId,
                        weight: 100
                    }]
                }
            }
        });
        return service;
    }

    /**
     * Creates a VPC Lattice service targetting an Application Load Balancer
     * @param props The service properties
     * @returns The VPC Lattice service
     */
    public createAlbLatticeService(props: {
        applicationLoadBalancerArn: string,
        authType?: string,
        certificateArn?: string,
        customDomainName?: string, // e.g. latticeservice.rainmaking.cloud.
        enableAccessLogs: boolean,
        hostedZone?: IHostedZone, // e.g. rainmaking.cloud.
        iamPolicyStatements?: PolicyStatement[]
        serviceName: string,
        vpcId: string
    }): vpclattice.CfnService {

        const serviceCertificate = props.customDomainName && props.certificateArn ? Certificate.fromCertificateArn(this, `${props.serviceName}-acm-certificate`, props.certificateArn)
            : props.customDomainName ? new Certificate(this, `${props.serviceName}-acm-construct-certificate`, {
                domainName: props.customDomainName,
                validation: CertificateValidation.fromDns(props.hostedZone)
            }) : null;

        const service = new vpclattice.CfnService(this, `${props.serviceName}-service`, {
            authType: !props.authType ? "NONE" : props.authType!,
            certificateArn: serviceCertificate && serviceCertificate.certificateArn || undefined,
            customDomainName: props.customDomainName,
            name: `${props.serviceName}-service`
        });

        // Minimal auth policy allowing access
        if (props.authType && props.authType === "AWS_IAM") {
            new vpclattice.CfnAuthPolicy(this, `${props.serviceName}-auth-policy`, {
                resourceIdentifier: service.attrArn,
                policy: {
                    Version: "2012-10-17",
                    Statement: props.iamPolicyStatements ? props.iamPolicyStatements : [{
                        Effect: "Allow",
                        Principal: "*",
                        Action: "vpc-lattice-svcs:Invoke",
                        Resource: "*"
                    }]
                }
            });
        }

        if (props.enableAccessLogs) {
            this._latticeServiceLogGroup = new LogGroup(this, `${props.serviceName}-log-group`, {
                retention: 1
            });
            new vpclattice.CfnAccessLogSubscription(this, "ServiceAccessLogSubscription", {
                destinationArn: this._latticeServiceLogGroup.logGroupArn,
                resourceIdentifier: service.attrArn
            });
        }

        // Create VPC Lattice Target Group with HTTPS only
        const targetGroup = new vpclattice.CfnTargetGroup(this, `${props.serviceName}-target-group`, {
            type: "ALB",
            targets: [{
                id: props.applicationLoadBalancerArn,
                port: 80
            }],
            config: {
                port: 80,
                protocol: "HTTP",
                vpcIdentifier: props.vpcId
            }
        });

        // Create VPC Lattice Listener with HTTPS only
        new vpclattice.CfnListener(this, `${props.serviceName}-listener`, {
            serviceIdentifier: service.attrId,
            protocol: "HTTPS",
            port: 443,
            defaultAction: {
                forward: {
                    targetGroups: [{
                        targetGroupIdentifier: targetGroup.attrId,
                        weight: 100
                    }]
                }
            }
        });

        if (props.customDomainName && props.hostedZone) {
            // Create DNS alias record for the CloudFront distribution
            new CnameRecord(this, `${props.serviceName}-cname-record`, {
                zone: props.hostedZone,
                recordName: `${props.customDomainName}`,
                domainName: service.attrDnsEntryDomainName
            });
        }
        return service;
    }

    /**
     * Associates a VPC Lattice service with the service network
     * @param service The VPC Lattice service to associate with the service network
     * @param associationName The association name
     * @returns The VPC Lattice service network service association
     */
    public associateService(service: vpclattice.CfnService, associationName: string): vpclattice.CfnServiceNetworkServiceAssociation {
        return new vpclattice.CfnServiceNetworkServiceAssociation(this, `ServiceNetworkServiceAssociation${associationName}`, {
            serviceIdentifier: service.attrId,
            serviceNetworkIdentifier: this._serviceNetwork.attrId
        });
    };

    /**
     * Enables service access through VPC Lattice service network
     * @param region AWS region for service endpoint
     * @returns Resource Gateway for service access
     */
    public enableServiceAccessGateway(service: string, region: string = "us-east-1"): vpclattice.CfnResourceGateway {
        // Create Resource Gateway
        const resourceGateway = new vpclattice.CfnResourceGateway(this, "DynamoDBResourceGateway", {
            name: `${service}-gateway`
        });

        // Create Resource Configuration for DynamoDB
        new vpclattice.CfnResourceConfiguration(this, `${service}DBResourceConfig`, {
            allowAssociationToSharableServiceNetwork: true,
            portRanges: ["443"],
            protocolType: "TCP",
            name: `${service}-${region}-resource-config`,
            resourceConfigurationAuthType: "NONE",
            resourceConfigurationDefinition: {
                domainName: `${service}.${region}.amazonaws.com`
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } as any,
            resourceConfigurationType: "SINGLE",
            resourceGatewayId: resourceGateway.attrId
        });

        return resourceGateway;
    }
}