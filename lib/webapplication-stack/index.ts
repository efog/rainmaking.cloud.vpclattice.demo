
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as ecs_patterns from "aws-cdk-lib/aws-ecs-patterns";

export class WebAppStack extends cdk.Stack {
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create VPC
        const vpc = new ec2.Vpc(this, "WebAppVPC", {
            maxAzs: 2
        });

        // Create ECS Cluster
        const cluster = new ecs.Cluster(this, "WebAppCluster", {
            vpc: vpc
        });

        // Create Fargate Service with Application Load Balancer
        const loadBalancedFargateService = new ecs_patterns.ApplicationLoadBalancedFargateService(this, "WebAppService", {
            cluster: cluster,
            cpu: 256,
            desiredCount: 1,
            taskImageOptions: {
                image: ecs.ContainerImage.fromRegistry("nginx:latest"),
                containerPort: 80
            },
            memoryLimitMiB: 512,
            publicLoadBalancer: true,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
            }
        });

        // Auto-scaling configuration
        const scaling = loadBalancedFargateService.service.autoScaleTaskCount({
            maxCapacity: 4,
            minCapacity: 2
        });

        scaling.scaleOnCpuUtilization("CpuScaling", {
            targetUtilizationPercent: 70,
            scaleInCooldown: cdk.Duration.seconds(60),
            scaleOutCooldown: cdk.Duration.seconds(60)
        });

        // Output the Load Balancer DNS
        new cdk.CfnOutput(this, "LoadBalancerDNS", {
            value: loadBalancedFargateService.loadBalancer.loadBalancerDnsName
        });
    }
}
