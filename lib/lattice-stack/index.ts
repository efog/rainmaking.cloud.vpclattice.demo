
import * as cdk from "aws-cdk-lib";
import * as vpclattice from "aws-cdk-lib/aws-vpclattice";
import * as elasticloadbalancingv2 from "aws-cdk-lib/aws-elasticloadbalancingv2";
import { Construct } from "constructs";

/**
 * VPC Lattice demo stack props
 */
interface VpcLatticeStackProps extends cdk.StackProps {
    serviceName: string;
    alb: elasticloadbalancingv2.IApplicationLoadBalancer;
}

/**
 * VPC Lattice demo stack
 */
export class VpcLatticeStack extends cdk.Stack {

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props: VpcLatticeStackProps) {
        super(scope, id, props);

        // Create VPC Lattice Service Network
        const serviceNetwork = new vpclattice.CfnServiceNetwork(this, "ServiceNetwork", {
            sharingConfig: {
                enabled: true
            } as cdk.aws_vpclattice.CfnServiceNetwork.SharingConfigProperty
        } as vpclattice.CfnServiceNetworkProps);

        // Create VPC Lattice Service with HTTPS only
        const service = new vpclattice.CfnService(this, "Service", {
            authType: "NONE",
        });

        // Associate Service with Service Network
        new vpclattice.CfnServiceNetworkServiceAssociation(this, "ServiceAssociation", {
            serviceNetworkIdentifier: serviceNetwork.attrId,
            serviceIdentifier: service.attrId,
        });

        // Create VPC Lattice Target Group with HTTPS only
        const targetGroup = new vpclattice.CfnTargetGroup(this, "TargetGroup", {
            type: "ALB",
            targets: [{
                id: props.alb.loadBalancerArn,
                port: 443
            }],
            config: {
                port: 443,
                protocol: "HTTPS",
                vpcIdentifier: props.alb.vpc!.vpcId
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
    }
}
