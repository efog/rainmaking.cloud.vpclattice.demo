import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { Construct } from "constructs";

/**
 * Default VPC Stack Props
 */
export interface WorkloadVpcConstructProps {
    dynamoDBGatewayVpcEndpoint: boolean,
    ecrInterfaceVpcEndpoint: boolean,
    ecsInterfaceVpcEndpoint: boolean,
    enableInternetAccess: boolean,
    s3GatewayVpcEndpoint: boolean,
}

/**
 * Default VPC for the application.
 */
export class WorkloadVpcConstruct extends Construct {
    
    public readonly vpc: ec2.Vpc;
    private readonly _albSubnets: cdk.aws_ec2.SelectedSubnets;

    public get albSubnets(): cdk.aws_ec2.SelectedSubnets {
        return this._albSubnets;
    }

    /**
     * Default constructor
     * @param scope stack scope
     * @param id stack id
     * @param props stack props
     */
    constructor(scope: Construct, id: string, props?: cdk.StackProps & WorkloadVpcConstructProps) {
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

        // Add required VPC endpoints for ECR image pulling
        this.vpc.addInterfaceEndpoint("EcrInterfaceEndpoint", {
            service: ec2.InterfaceVpcEndpointAwsService.ECR
        });
        this.vpc.addInterfaceEndpoint("EcrDockerInterfaceEndpoint", {
            service: ec2.InterfaceVpcEndpointAwsService.ECR_DOCKER
        });
        this.vpc.addGatewayEndpoint("S3GatewayEndpoint", {
            service: ec2.GatewayVpcEndpointAwsService.S3
        });
        this.vpc.addInterfaceEndpoint("CloudwatchLogsInterfaceEndpoint", {
            service: ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS
        });


        if (props?.dynamoDBGatewayVpcEndpoint) {
            this.vpc.addGatewayEndpoint("DynamoDBGatewayEndpoint", {
                service: ec2.GatewayVpcEndpointAwsService.DYNAMODB
            });
        }
        if (props?.ecsInterfaceVpcEndpoint) {
            this.vpc.addInterfaceEndpoint("EcsInterfaceEndpoint", {
                service: ec2.InterfaceVpcEndpointAwsService.ECS
            });
        }
        this._albSubnets = this.vpc.selectSubnets({
            subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS
        });
    }

    addInterfaceVpcEndpoint(service: ec2.InterfaceVpcEndpointAwsService) {
        this.vpc.addInterfaceEndpoint(service.toString(), {
            service: service
        });
    }
}
