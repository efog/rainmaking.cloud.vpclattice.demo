import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { WebApiStack } from "./webapi-stack";
import { VpcLatticeStack } from "./lattice-stack";

export interface VpclatticedemoStackProps extends cdk.StackProps {
    consumerVpcId?: string;
    serviceVpcId?: string;
}

/**
 * VPC Lattice demo stack
 */
export class VpclatticedemoStack extends cdk.Stack {

    private readonly _WebApiStack: WebApiStack;
    private _vpcLatticeStack: VpcLatticeStack;

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props?: VpclatticedemoStackProps & cdk.StackProps) {
        super(scope, id, props);

        // this._consumerVpc = props?.consumerVpcId
        //     ? ec2.Vpc.fromLookup(this, "ExistingConsumerVPC", { vpcId: props.consumerVpcId })
        //     : new DefaultVpcConstruct(this, "default-consumer-vpc", {}).vpc;

        this._WebApiStack = new WebApiStack(this, "WebApi", Object.assign(props!, {
        }));
        this._vpcLatticeStack = new VpcLatticeStack(this, "VpcLattice", Object.assign(props!, {
            alb: this._WebApiStack.alb,
            serviceName: "vpcLatticeDemo"
        }));
    }
}      