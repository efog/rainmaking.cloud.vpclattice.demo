import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { AppServerStack } from "./appserver";
// import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Lattice } from "./lattice";

export interface VpclatticedemoStackProps extends cdk.StackProps {
    consumerVpcId?: string;
    serviceVpcId?: string;
}

/**
 * VPC Lattice demo stack
 */
export class VpclatticedemoStack extends cdk.Stack {

    private readonly _appServerStack: AppServerStack;
    private readonly _vpcLatticeStack: Lattice;
    private readonly _defaultVpc: cdk.aws_ec2.IVpc;
    private readonly _hostedZone: cdk.aws_route53.IHostedZone;
    private readonly _appserverService: cdk.aws_vpclattice.CfnService;

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props?: VpclatticedemoStackProps & cdk.StackProps) {
        super(scope, id, props);

        this._defaultVpc = cdk.aws_ec2.Vpc.fromLookup(this, "DefaultVPC", { isDefault: true });
        // this._hostedZone = HostedZone.fromLookup(this, "AppServerHostedZone", {
        //     domainName: "thisisnothelpful.com"
        // });

        this._appServerStack = new AppServerStack(this, "AppServer", Object.assign(props!, {
            // appserverName: "appserver",
            // hostedZone: this._hostedZone
        }));

        this._vpcLatticeStack = new Lattice(this, "VpcLattice",
            {
                enableAccessLogs: true,
            }
        );
        this._vpcLatticeStack.associateVpc(this._defaultVpc, "consumer-asscn");
        this._appserverService = this._vpcLatticeStack.createAlbLatticeService({
            applicationLoadBalancer: this._appServerStack.alb,
            // certificateArn: this.node.tryGetContext("config/lattice-certificate-arn"),
            // customDomainName: this.node.tryGetContext("config/lattice-custom-domain-name"),
            enableAccessLogs: true,
            // hostedZone: this._hostedZone,
            serviceName: "appserver",
        });
        this._vpcLatticeStack.associateService(this._appserverService, "domain-asscn");
    }
}      
