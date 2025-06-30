
import * as cdk from "aws-cdk-lib";
import { WorkloadVpcConstruct } from "../workload-vpc";
import { Construct } from "constructs";
import { Vpc } from "aws-cdk-lib/aws-ec2";

export class FrontendStack extends cdk.Stack {
    private readonly _vpc: WorkloadVpcConstruct;
    /**
     * Consumer stack VPC
     */
    public get vpc() : Vpc {
        return this._vpc.vpc;
    }

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        this._vpc = new WorkloadVpcConstruct(this, "FrontendStackVpc", {
            dynamoDBGatewayVpcEndpoint: true,
            ecrInterfaceVpcEndpoint: true,
            ecsInterfaceVpcEndpoint: true,
            enableInternetAccess: false,
            s3GatewayVpcEndpoint: true
        });
        
        // // Create ECS Cluster
        // const cluster = new ecs.Cluster(this, "ConsumerCluster", {
        //     vpc: vpc.vpc
        // });

        // // Create Fargate Service with Application Load Balancer
        // const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "ConsumerService", {
        //     cluster: cluster,
        //     cpu: 256,
        //     desiredCount: 1,
        //     taskImageOptions: {
        //         image: ecs.ContainerImage.fromRegistry("nginx:latest"),
        //         containerPort: 80
        //     },
        //     memoryLimitMiB: 512,
        //     publicLoadBalancer: true,
        //     runtimePlatform: {
        //         cpuArchitecture: ecs.CpuArchitecture.ARM64,
        //         operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
        //     }
        // });

        // // Auto-scaling configuration
        // const scaling = loadBalancedFargateService.service.autoScaleTaskCount({
        //     maxCapacity: 4,
        //     minCapacity: 2
        // });

        // scaling.scaleOnCpuUtilization("CpuScaling", {
        //     targetUtilizationPercent: 70,
        //     scaleInCooldown: cdk.Duration.seconds(60),
        //     scaleOutCooldown: cdk.Duration.seconds(60)
        // });

        // // Output the Load Balancer DNS
        // new cdk.CfnOutput(this, "LoadBalancerDNS", {
        //     value: loadBalancedFargateService.loadBalancer.loadBalancerDnsName
        // });
    }
}
