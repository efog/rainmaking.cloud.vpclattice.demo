import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

/**
 * Default VPC Stack Props
 */
export interface WorkloadsVpcProps {
    enableInternetAccess: boolean,
    interfaceEndpoints?: cdk.aws_ec2.InterfaceVpcEndpointAwsService[],
    gatewayEndpoints?: cdk.aws_ec2.GatewayVpcEndpointAwsService[]
}

/**
 * Workload VPC construct.
 */
export class WorkloadsVpc extends Construct {

    public readonly vpc: ec2.Vpc;
    private readonly _privateSubnetsWithEgress: cdk.aws_ec2.SelectedSubnets;
    private readonly _interfaceEndpoints: { [key: string]: cdk.aws_ec2.InterfaceVpcEndpoint; };
    public get interfaceEndpoints(): { [key: string]: cdk.aws_ec2.InterfaceVpcEndpoint; } {
        return this._interfaceEndpoints;
    }
    private readonly _gatewayEndpoints: { [key: string]: cdk.aws_ec2.GatewayVpcEndpoint; };
    public get gatewayEndpoints(): { [key: string]: cdk.aws_ec2.GatewayVpcEndpoint; } {
        return this._gatewayEndpoints;
    }
    public get privateSubnetsWithEgress(): cdk.aws_ec2.SelectedSubnets {
        return this._privateSubnetsWithEgress;
    }

    /**
     * Default constructor
     * @param scope stack scope
     * @param id stack id
     * @param props stack props
     */
    constructor(scope: Construct, id: string, props?: cdk.StackProps & WorkloadsVpcProps) {
        super(scope, id);

        // Create VPC with appropriate subnet configuration
        const subnetConfiguration = [];

        // Add public subnets if internet access is enabled
        if (props?.enableInternetAccess) {
            subnetConfiguration.push({
                name: "public",
                subnetType: ec2.SubnetType.PUBLIC,
                cidrMask: 24
            });
        }

        // Always add private subnets - one per AZ
        subnetConfiguration.push({
            name: "private",
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
            cidrMask: 24
        });

        this.vpc = new ec2.Vpc(this, "Vpc", {
            maxAzs: 3, // Use up to 3 AZs
            createInternetGateway: props?.enableInternetAccess ?? false,
            natGateways: props?.enableInternetAccess ? 1 : 0,
            subnetConfiguration: subnetConfiguration,
            flowLogs: {
                "VpcFlowLogs": {
                    destination: ec2.FlowLogDestination.toCloudWatchLogs(),
                    trafficType: ec2.FlowLogTrafficType.ALL
                }
            },
            enableDnsHostnames: true,
            enableDnsSupport: true,
        } as ec2.VpcProps);

        const interfaceEndpoints: { [key: string]: ec2.InterfaceVpcEndpoint } = {};
        if (props?.interfaceEndpoints) {
            props.interfaceEndpoints.forEach(endpoint => {
                const interfaceEndpoint = this.vpc.addInterfaceEndpoint(endpoint.shortName, { service: endpoint });
                interfaceEndpoints[endpoint.shortName] = interfaceEndpoint;
            });
        }
        this._interfaceEndpoints = interfaceEndpoints;

        const gatewayEndpoints: { [key: string]: ec2.GatewayVpcEndpoint } = {};
        gatewayEndpoints[ec2.GatewayVpcEndpointAwsService.S3.name] = this.vpc.addGatewayEndpoint("S3GatewayEndpoint", {
            service: ec2.GatewayVpcEndpointAwsService.S3
        });
        gatewayEndpoints[ec2.GatewayVpcEndpointAwsService.S3_EXPRESS.name] = this.vpc.addGatewayEndpoint("S3ExpressGatewayEndpoint", {
            service: ec2.GatewayVpcEndpointAwsService.S3_EXPRESS
        });
        gatewayEndpoints[ec2.GatewayVpcEndpointAwsService.DYNAMODB.name] = this.vpc.addGatewayEndpoint("DynamoDBGatewayEndpoint", {
            service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
        });
        this._gatewayEndpoints = gatewayEndpoints;

        this._privateSubnetsWithEgress = this.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        });
    }
}
