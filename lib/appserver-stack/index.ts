
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { Construct } from "constructs";
import { WorkloadVpcConstruct } from "../workload-vpc";
import { IHostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
// import * as ecsp from "aws-cdk-lib/aws-ecs-patterns";

/**
 * Web Server Stack Props
 */
interface AppServerStackProps extends cdk.StackProps {
    appserverName: string;
    ecrRepositoryArn?: string;
    hostedZone: IHostedZone;
    vpcId?: string;
}

/**
 * Web Server Stack
 * This stack creates a simple web server using ECS Fargate
 */
export class AppServerStack extends cdk.Stack {
    
    private readonly _alb: cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer;
    public get alb(): cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer {
        return this._alb;
    }

    /**
     * Default constructor
     * @param scope The parent construct
     * @param id The construct ID
     * @param props The stack properties
     */
    constructor(scope: Construct, id: string, props: AppServerStackProps) {
        super(scope, id, props);

        const appServerDomainName = `${props.appserverName}.${props.hostedZone.zoneName}`;
        const vpc = new WorkloadVpcConstruct(this, "AppServerStackVpc", {
            dynamoDBGatewayVpcEndpoint: true,
            ecrInterfaceVpcEndpoint: true,
            ecsInterfaceVpcEndpoint: true,
            enableInternetAccess: false,
            s3GatewayVpcEndpoint: true
        });

        // Create Security Group for ALB
        const albSecurityGroup = new ec2.SecurityGroup(this, "AlbSecurityGroup", {
            vpc: vpc.vpc,
            allowAllOutbound: true,
            description: "Security group for ALB"
        });

        albSecurityGroup.addIngressRule(
            ec2.Peer.anyIpv4(),
            ec2.Port.tcp(443),
            "Allow HTTPS traffic from anywhere"
        );

        // Create ALB
        this._alb = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(this, "AppServerALB", {
            vpc: vpc.vpc,
            internetFacing: false,
            securityGroup: albSecurityGroup
        });

        // Create Target Group
        const targetGroup = new cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup(this, "AppServerTargetGroup", {
            vpc: vpc.vpc,
            port: 80,
            protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
            targetType: cdk.aws_elasticloadbalancingv2.TargetType.IP,
            healthCheck: {
                path: "/api",
                healthyHttpCodes: "200"
            }
        });

        const appserverAlbCertificate = new Certificate(this, "AppServerAlbCertificate", {
            domainName: `alb.${appServerDomainName}`,
            validation: CertificateValidation.fromDns(props.hostedZone)
        });

        // Add Listener
        this._alb.addListener("AppServerListener", {
            port: 443,
            protocol: ApplicationProtocol.HTTPS,
            defaultTargetGroups: [targetGroup],
            certificates: [appserverAlbCertificate]
        });

        // Create DNS record for ALB
        new route53.ARecord(this, "AppServerAliasRecord", {
            zone: props.hostedZone,
            target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(this._alb)),
            recordName: `alb.${appServerDomainName}`
        });

        // Create Security Group for ECS Tasks
        const ecsSecurityGroup = new ec2.SecurityGroup(this, "EcsSecurityGroup", {
            vpc: vpc.vpc,
            allowAllOutbound: true,
            description: "Security group for ECS tasks"
        });

        ecsSecurityGroup.addIngressRule(
            albSecurityGroup,
            ec2.Port.tcp(80),
            "Allow traffic from ALB"
        );

        // Create Task Role
        const taskRole = new iam.Role(this, "AppServerTaskRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
        });

        // Create Execution Role
        const taskExecutionRole = new iam.Role(this, "AppServerTaskExecutionRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy")]
        });

        const dockerImage = new DockerImageAsset(this, "AppServerImage", {
            directory: path.join(__dirname, "."),
            platform: cdk.aws_ecr_assets.Platform.LINUX_ARM64 // Build for ARM64 (Graviton)
        });
        dockerImage.repository.grantPull(taskExecutionRole);

        // Create ECS Cluster
        const cluster = new ecs.Cluster(this, "AppServerCluster", {
            vpc: vpc.vpc
        });

        // Create Task Definition for ARM64 (Graviton)
        const taskDefinition = new ecs.FargateTaskDefinition(this, "AppServerTaskDef", {
            memoryLimitMiB: 512,
            cpu: 256,
            taskRole: taskRole,
            executionRole: taskExecutionRole,
            runtimePlatform: {
                cpuArchitecture: ecs.CpuArchitecture.ARM64,
                operatingSystemFamily: ecs.OperatingSystemFamily.LINUX
            }
        });

        // Add container to task definition
        taskDefinition.addContainer("AppServerContainer", {
            image: ecs.ContainerImage.fromDockerImageAsset(dockerImage),
            portMappings: [{ containerPort: 80, hostPort: 80 }],
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: "AppServer" })
        });

        // Update Fargate Service with ALB integration
        const appserverService = new ecs.FargateService(this, "AppServerService", {
            cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: false,
            securityGroups: [ecsSecurityGroup],
            minHealthyPercent: 0
        });
        targetGroup.addTarget(appserverService.loadBalancerTarget({
            containerName: "AppServerContainer",
            containerPort: 80
        }));
    }
}
