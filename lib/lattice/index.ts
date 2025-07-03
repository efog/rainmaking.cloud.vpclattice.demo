
import * as cdk from "aws-cdk-lib";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import { Construct } from "constructs";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { CnameRecord, IHostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { LogGroup } from "aws-cdk-lib/aws-logs";

/**
 * Lattice construct
 */
export class Lattice extends Construct {

    private _serviceNetwork: cdk.aws_vpclattice.CfnServiceNetwork;
    private _latticeServiceLogGroup: cdk.aws_logs.ILogGroup;
    private _latticeServiceNetworkLogGroup: cdk.aws_logs.ILogGroup;

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props: {
        enableAccessLogs?: boolean
    }) {
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
    }

    /**
     * Associates a VPC with the service network
     * @param vpcId The VPC ID
     */
    public associateVpc(vpc: IVpc, associationName: string): vpclattice.CfnServiceNetworkVpcAssociation {
        const targetVpc = vpc;
        return new vpclattice.CfnServiceNetworkVpcAssociation(this, `ServiceNetworkVpcAssociation${associationName}`, {
            vpcIdentifier: targetVpc.vpcId,
            serviceNetworkIdentifier: this._serviceNetwork.attrId
        });
    }

    /**
     * Creates a VPC Lattice service targetting an Application Load Balancer
     * @param props The service properties
     * @returns The VPC Lattice service
     */
    public createAlbLatticeService(props: {
        applicationLoadBalancer: cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer,
        certificateArn?: string,
        customDomainName?: string, // e.g. latticeservice.rainmaking.cloud.
        enableAccessLogs: boolean,
        hostedZone?: IHostedZone, // e.g. rainmaking.cloud.
        serviceName: string
    }): vpclattice.CfnService {

        const serviceCertificate = props.customDomainName && props.certificateArn ? Certificate.fromCertificateArn(this, `${props.serviceName}-acm-certificate`, props.certificateArn)
            : props.customDomainName ? new Certificate(this, `${props.serviceName}-acm-construct-certificate`, {
                domainName: props.customDomainName,
                validation: CertificateValidation.fromDns(props.hostedZone)
            }) : null;
        const service = new vpclattice.CfnService(this, `${props.serviceName}-service`, {
            authType: "NONE",
            certificateArn: serviceCertificate && serviceCertificate.certificateArn || undefined,
            customDomainName: props.customDomainName
        });

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
                id: props.applicationLoadBalancer.loadBalancerArn,
                port: 80
            }],
            config: {
                port: 80,
                protocol: "HTTP",
                vpcIdentifier: props.applicationLoadBalancer.vpc!.vpcId
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
}
