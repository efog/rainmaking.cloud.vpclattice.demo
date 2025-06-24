
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import { DockerImageAsset } from "aws-cdk-lib/aws-ecr-assets";
import * as ecs from "aws-cdk-lib/aws-ecs";
import * as iam from "aws-cdk-lib/aws-iam";
import * as path from "path";
import { Construct } from "constructs";
import { DefaultVpcConstruct } from "../default-vpc";
import { HostedZone } from "aws-cdk-lib/aws-route53";
import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { ApplicationProtocol } from "aws-cdk-lib/aws-elasticloadbalancingv2";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
// import * as ecsp from "aws-cdk-lib/aws-ecs-patterns";

/**
 * Web Server Stack Props
 */
interface WebApiStackProps extends cdk.StackProps {
    vpcId?: string;
    ecrRepositoryArn?: string;
}

/**
 * Web Server Stack
 * This stack creates a simple web server using ECS Fargate
 */
export class WebApiStack extends cdk.Stack {
    
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
    constructor(scope: Construct, id: string, props: WebApiStackProps) {
        super(scope, id, props);

        const vpc = new DefaultVpcConstruct(this, "WebserverStackVpc", {
            dynamoDBGatewayVpcEndpoint: true,
            ecrInterfaceVpcEndpoint: true,
            ecsInterfaceVpcEndpoint: true,
            enableInternetAccess: false,
            s3GatewayVpcEndpoint: true
        });

        const webserverHostedZone = HostedZone.fromLookup(this, "WebApiHostedZone", {
            domainName: "thisisnothelpful.com"
        });

        const webserverAlbCertificate = new Certificate(this, "WebApiAlbCertificate", {
            domainName: "*.vpclatticedemo.thisisnothelpful.com",
            validation: CertificateValidation.fromDns(webserverHostedZone)
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
        this._alb = new cdk.aws_elasticloadbalancingv2.ApplicationLoadBalancer(this, "WebApiALB", {
            vpc: vpc.vpc,
            internetFacing: false,
            securityGroup: albSecurityGroup
        });

        // Create Target Group
        const targetGroup = new cdk.aws_elasticloadbalancingv2.ApplicationTargetGroup(this, "WebApiTargetGroup", {
            vpc: vpc.vpc,
            port: 80,
            protocol: cdk.aws_elasticloadbalancingv2.ApplicationProtocol.HTTP,
            targetType: cdk.aws_elasticloadbalancingv2.TargetType.IP,
            healthCheck: {
                path: "/api",
                healthyHttpCodes: "200"
            }
        });

        // Add Listener
        this._alb.addListener("WebApiListener", {
            port: 443,
            protocol: ApplicationProtocol.HTTPS,
            defaultTargetGroups: [targetGroup],
            certificates: [webserverAlbCertificate]
        });

        // Create DNS record for ALB
        new route53.ARecord(this, "WebApiAliasRecord", {
            zone: webserverHostedZone,
            target: route53.RecordTarget.fromAlias(new targets.LoadBalancerTarget(this._alb)),
            recordName: "api.vpclatticedemo"
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
        const taskRole = new iam.Role(this, "WebApiTaskRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com")
        });

        // Create Execution Role
        const taskExecutionRole = new iam.Role(this, "WebApiTaskExecutionRole", {
            assumedBy: new iam.ServicePrincipal("ecs-tasks.amazonaws.com"),
            managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy")]
        });

        const dockerImage = new DockerImageAsset(this, "WebApiImage", {
            directory: path.join(__dirname, "."),
            platform: cdk.aws_ecr_assets.Platform.LINUX_ARM64 // Build for ARM64 (Graviton)
        });
        dockerImage.repository.grantPull(taskExecutionRole);

        // Create ECS Cluster
        const cluster = new ecs.Cluster(this, "WebApiCluster", {
            vpc: vpc.vpc
        });

        // Create Task Definition for ARM64 (Graviton)
        const taskDefinition = new ecs.FargateTaskDefinition(this, "WebApiTaskDef", {
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
        taskDefinition.addContainer("WebApiContainer", {
            image: ecs.ContainerImage.fromDockerImageAsset(dockerImage),
            portMappings: [{ containerPort: 80, hostPort: 80 }],
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: "WebApi" })
        });

        // Update Fargate Service with ALB integration
        const webserverService = new ecs.FargateService(this, "WebApiService", {
            cluster,
            taskDefinition,
            desiredCount: 1,
            assignPublicIp: false,
            securityGroups: [ecsSecurityGroup],
            minHealthyPercent: 0
        });
        targetGroup.addTarget(webserverService.loadBalancerTarget({
            containerName: "WebApiContainer",
            containerPort: 80
        }));
    }
}
