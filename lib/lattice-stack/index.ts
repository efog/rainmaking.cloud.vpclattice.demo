
import * as cdk from "aws-cdk-lib";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import { Construct } from "constructs";
import { IVpc } from "aws-cdk-lib/aws-ec2";
import { ARecord, IHostedZone, RecordTarget } from "aws-cdk-lib/aws-route53";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";

/**
 * VPC Lattice demo stack props
 */
interface LatticeStackProps extends cdk.StackProps {
    hostedZone: IHostedZone;
}

/**
 * VPC Lattice demo stack
 */
export class LatticeStack extends cdk.Stack {

    private _serviceNetwork: cdk.aws_vpclattice.CfnServiceNetwork;
    private _hostedZone: cdk.aws_route53.IHostedZone;

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props: LatticeStackProps) {
        super(scope, id, props);
        this._hostedZone = props.hostedZone;
        // Create VPC Lattice Service Network
        this._serviceNetwork = new vpclattice.CfnServiceNetwork(this, "ServiceNetwork", {
            sharingConfig: {
                enabled: true
            } as cdk.aws_vpclattice.CfnServiceNetwork.SharingConfigProperty
        } as vpclattice.CfnServiceNetworkProps);
    }

    /**
     * Adds a VPC to the service network
     * @param vpcId The VPC ID
     */
    createVpcAssociation(vpc: IVpc, associationName: string) {
        const targetVpc = vpc;
        new vpclattice.CfnServiceNetworkVpcAssociation(this, `ServiceNetworkVpcAssociation${associationName}`, {
            vpcIdentifier: targetVpc.vpcId,
            serviceNetworkIdentifier: this._serviceNetwork.attrId
        });
    }

    addAlbService(alb: cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer, serviceName: string): vpclattice.CfnService {

        const serviceCertificate = new Certificate(this, "LatticeServiceDomainCertificate", {
            domainName: `latticeservice.${serviceName}.${this._hostedZone.zoneName}`,
            validation: CertificateValidation.fromDns(this._hostedZone)
        });
        // Create VPC Lattice Service with HTTPS only
        const service = new vpclattice.CfnService(this, "Service", {
            authType: "NONE",
            certificateArn: serviceCertificate.certificateArn,
            customDomainName: `latticeservice.${serviceName}.${this._hostedZone.zoneName}`,
            name: serviceName,
        });

        
        // Associate Service with Service Network
        new vpclattice.CfnServiceNetworkServiceAssociation(this, "ServiceAssociation", {
            serviceNetworkIdentifier: this._serviceNetwork.attrId,
            serviceIdentifier: service.attrId,
        });

        // Create VPC Lattice Target Group with HTTPS only
        const targetGroup = new vpclattice.CfnTargetGroup(this, "TargetGroup", {
            type: "ALB",
            targets: [{
                id: alb.loadBalancerArn,
                port: 443
            }],
            config: {
                port: 443,
                protocol: "HTTPS",
                vpcIdentifier: alb.vpc!.vpcId
            }
        });

        // Create VPC Lattice Listener with HTTPS only
        new vpclattice.CfnListener(this, "Listener", {
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

        // Create DNS alias record for the Lattice service
        new ARecord(this, "ServiceAliasRecord", {
            zone: this._hostedZone,
            recordName: `${serviceName}.${this._hostedZone.zoneName}`,
            target: RecordTarget.fromAlias({
                bind: () => ({
                    dnsName: service.attrDnsEntryDomainName,
                    hostedZoneId: service.attrDnsEntryHostedZoneId
                })
            })
        });

        return service;
    }
}
