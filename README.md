# VPC Lattice Demo Application

This project demonstrates how to use AWS VPC Lattice to enable secure service-to-service communication across multiple VPCs and accounts.

## Overview

The application deploys a sample microservices architecture using VPC Lattice as the service networking layer. It includes:

- A VPC Lattice service network
- Multiple VPCs with service and client workloads
- Service discovery and routing configuration
- Security groups and IAM policies for access control

## Architecture

The infrastructure creates:

1. A VPC Lattice service network that acts as the connectivity backbone
2. Producer VPC containing backend services
3. Consumer VPC with client applications
4. Service associations and routing rules
5. Security groups and IAM roles for secure access

## Prerequisites

- AWS CDK CLI v2.x
- Node.js 14.x or later
- AWS account and credentials configured

## Deployment

1. Install dependencies:
PC Lattice Demo Application

This project demonstrates how to use AWS VPC Lattice to enable secure service-to-service communication across multiple VPCs and accounts.

## Overview

The application deploys a sample microservices architecture using VPC Lattice as the service networking layer. It includes:

- A VPC Lattice service network
- Multiple VPCs with service and client workloads
- Service discovery and routing configuration
- Security groups and IAM policies for access control

## Architecture

The infrastructure creates:

1. A VPC Lattice service network that acts as the connectivity backbone
2. Producer VPC containing backend services
3. Consumer VPC with client applications
4. Service associations and routing rules
5. Security groups and IAM roles for secure access

## Prerequisites

- AWS CDK CLI v2.x
- Node.js 14.x or later
- AWS account and credentials configured

## Deployment
### Infrastructure Components

The VPC Lattice Demo application deploys the following components:

#### 1. Workload VPC
- **Private subnets** across 3 availability zones
- **VPC endpoints** for ECR, S3, and CloudWatch Logs
- **Flow logs** enabled for monitoring
- **Security groups** for controlled access

#### 2. Application Server (ECS Fargate)
- **ARM64 Graviton** containers for cost optimization
- **Application Load Balancer** with internal access
- **Auto Scaling** with minimum healthy percent of 0
- **CloudWatch logging** for application monitoring

#### 3. Lambda Function
- **Node.js 22.x runtime** in VPC
- **Security group** integration
- **VPC subnet** deployment

#### 4. VPC Lattice Service Network
- **Service network** with sharing enabled
- **Access logging** to CloudWatch
- **VPC associations** with security groups
- **Service associations** for ALB and Lambda

#### 5. Services Exposed
- **AppServer service** - ECS application via ALB
- **Lambda service** - Serverless function
- **DynamoDB access** - Via Resource Gateway (optional)

### Deployment Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Bootstrap CDK (if first time):**
   ```bash
   cdk bootstrap
   ```

3. **Deploy the stack:**
   ```bash
   cdk deploy
   ```

4. **Verify deployment:**
   ```bash
   aws vpc-lattice list-service-networks
   aws vpc-lattice list-services
   ```

### Configuration Options

The stack supports the following configuration:

- **Internet Access**: Disabled by default for security
- **VPC Endpoints**: ECR, S3, CloudWatch Logs, DynamoDB
- **Authentication**: AWS IAM with configurable policies
- **Logging**: Access logs for service network and services
- **Custom Domains**: Optional SSL certificates and Route53 integration

### Access Patterns

1. **Cross-VPC Communication**: Services communicate through VPC Lattice service network
2. **Service Discovery**: Automatic DNS resolution via VPC Lattice
3. **Load Balancing**: Built-in load balancing across targets
4. **Security**: IAM-based authentication and security group controls

### Cleanup

To remove all resources:

```bash
cdk destroy
```

**Note**: Ensure all VPC Lattice associations are removed before destroying the stack.