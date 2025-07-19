import * as cdk from "aws-cdk-lib";
import * as path from "path";
import { Construct } from "constructs";
import { AppServer } from "./appserver";
import { Lattice } from "./lattice";
import { LambdaVpcFunctionConstruct } from "./functions";
import { WorkloadsVpc } from "./workloads-vpc";
import { InterfaceVpcEndpointAwsService } from "aws-cdk-lib/aws-ec2";

export interface VpclatticedemoStackProps extends cdk.StackProps {
    workloadVpcId?: string
}

/**
 * VPC Lattice demo stack
 */
export class VpclatticedemoStack extends cdk.Stack {

    private readonly _appServerStack: AppServer;
    private readonly _vpcLatticeStack: Lattice;
    private readonly _defaultVpc: cdk.aws_ec2.IVpc;
    private readonly _appserverService: cdk.aws_vpclattice.CfnService;
    private readonly _lambda: LambdaVpcFunctionConstruct;
    private readonly _workloadsVpc: WorkloadsVpc;
    private readonly _lambdaService: cdk.aws_vpclattice.CfnService;

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props?: VpclatticedemoStackProps & cdk.StackProps) {
        super(scope, id, props);

        // Workloads setup
        this._defaultVpc = cdk.aws_ec2.Vpc.fromLookup(this, "DefaultVPC", { isDefault: true });
        this._workloadsVpc = new WorkloadsVpc(this, "WorkloadsVpc", Object.assign({
        }, {
            enableInternetAccess: false,
            interfaceEndpoints: [InterfaceVpcEndpointAwsService.ECR,
                InterfaceVpcEndpointAwsService.ECR_DOCKER,
                InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS,
                InterfaceVpcEndpointAwsService.ECS
            ]
        }));
        this._lambda = new LambdaVpcFunctionConstruct(this, "LambdaFunction", {
            entry: path.join(__dirname, "functions", "demo", "src", "index.ts"),
            vpc: this._workloadsVpc.vpc
        });
        this._appServerStack = new AppServer(this, "AppServer", Object.assign(props!, {
            vpc: this._workloadsVpc.vpc
        }));

        // Lattice setup
        this._vpcLatticeStack = new Lattice(this, "VpcLattice", {
            createServicesVpc: false,
            enableAccessLogs: true
        });
        this._vpcLatticeStack.associateVpc(this._defaultVpc, "consumer-asscn");
        this._appserverService = this._vpcLatticeStack.createAlbLatticeService({
            applicationLoadBalancerArn: this._appServerStack.alb.loadBalancerArn,
            enableAccessLogs: true,
            serviceName: "appserver",
            vpcId: this._workloadsVpc.vpc.vpcId
        });
        this._lambdaService = this._vpcLatticeStack.createLambdaLatticeService(
            {
                authType: "AWS_IAM",
                handler: this._lambda.lambdaFunction,
                serviceName: "lambda",
            });
        this._vpcLatticeStack.associateService(this._appserverService, "appserver-asscn");
        this._vpcLatticeStack.associateService(this._lambdaService, "lambda-asscn");

        // this._vpcLatticeStack.enableServiceAccessGateway("s3");
    }
}      
