![heading](https://assets.rainmaking.cloud/images/flatiron_compressed.png)

# Modernize Cloud Applications with AWS VPC Lattice
 
As cloud applications evolve from simple three-tier architectures to complex microservices ecosystems, traditional networking approaches become bottlenecks to innovation. Teams struggle with VPC peering complexity, Transit Gateway costs, and the operational overhead of managing service-to-service connectivity at scale. [AWS VPC Lattice](https://docs.aws.amazon.com/vpc-lattice/) emerges as a purpose-built solution that addresses these scalability, security, and operational efficiency challenges in modern cloud architectures.
 
## What is AWS VPC Lattice?
 
VPC Lattice is a [Layer 7](https://www.paloaltonetworks.com/cyberpedia/what-is-layer-7) networking service that connects, secures, and monitors microservices on AWS. Operating at the application layer, it routes HTTP/HTTPS traffic based on headers, paths, and methods—enabling intelligent service-to-service communication.
 
## Compelling Use Case: Serverless Applications
 
VPC Lattice enhances serverless applications on AWS, whether built with Lambda Functions or ECS Tasks on Fargate, by improving:
 
- **Development**: No changes to existing workflows
- **Networking**: Simplified connectivity between services
- **Security**: IAM-based access control
- **Monitoring**: Centralized observability
 
### Preserving Existing Investments
 
Your current AWS ECS and Lambda patterns remain valid. Development teams can maintain their CI/CD pipelines and infrastructure patterns while gaining the benefits of network decoupling.
 
### Simplified Networking
 
With VPC Lattice, you no longer need to allocate enterprise IP address space for microservices. Each application can use standard VPC CIDR blocks (like 172.31.0.0/16), making VPC peering and Transit Gateway connections optional rather than required.
 
### Cross-Organization Integration
 
VPC Lattice facilitates integration with other Line of Business systems both on-premises and in AWS through AWS Resource Access Manager (RAM). As a Layer 7 service, it simplifies complex integration scenarios by focusing on application-level communication rather than network-level connectivity.
 
### Streamlined Authentication
 
Services deployed on VPC Lattice can leverage familiar IAM policies for access control, often eliminating the need for custom authentication solutions or third-party OIDC providers.

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": "arn:aws:iam::123456789012:role/allowed-service-role"
            },
            "Action": [
                "vpc-lattice:Invoke"
            ],
            "Resource": "arn:aws:vpc-lattice:us-east-1:123456789012:service/svc-*"
        },
        {
            "Effect": "Deny",
            "Principal": "*",
            "Action": [
                "vpc-lattice:Invoke"  
            ],
            "Resource": "arn:aws:vpc-lattice:us-east-1:123456789012:service/svc-*",
            "Condition": {
                "StringNotEquals": {
                    "aws:PrincipalArn": "arn:aws:iam::123456789012:role/allowed-service-role"
                }
            }
        }
    ]
}
```
 
## How Does It Work?
 
VPC Lattice operates through a sophisticated yet straightforward mechanism:
 
1. **Service Network Creation**: You create a service network that serves as the backbone for service-to-service communication.
 
2. **VPC Association**: You associate one or more VPCs with this service network. A single VPC can be associated with multiple service networks for logical separation of concerns.
 
3. **Service Registration**: Services (like ALBs, Lambda functions, or other AWS resources) are registered with the service network.
 
4. **Networking Magic**: Behind the scenes, VPC Lattice creates special routes in your VPC routing tables that direct traffic destined for the 169.254.0.0/16 CIDR block (similar to the EC2 metadata service approach) to the Lattice infrastructure.
 
5. **DNS Resolution**: VPC Lattice automatically creates DNS entries for your services, allowing applications to discover and connect to them using domain names rather than IP addresses.
 
This architecture eliminates the need for complex VPC peering or Transit Gateway configurations while maintaining security through IAM policies and security groups.
 
## Service Quotas and Limitations
 
While VPC Lattice offers significant benefits, it's important to be aware of its service quotas and limitations:
 
### Default Service Quotas (Soft Limits)
 
- **Service Networks**: 10 per AWS Region
- **Services**: 500 per AWS Region
- **VPC Associations**: 10 per service network
- **Service Associations**: 500 per service network
- **Listeners**: 5 per service
- **Rules**: 5 per listener
- **Target Groups**: 5 per service
- **Targets**: 1,000 per target group
 
As usual, before requesting changes to limits, validate that the architecture is not the issue. Simple changes often lead to improvements that don't require quota changes.
 
### Performance Considerations (Hard Limits)
 
- **Request Rate**: Up to 50,000 requests per second per service
- **Connection Timeout**: 10 seconds maximum
- **Request Timeout**: 60 seconds maximum
- **Response Size**: 1 MB maximum
 
### Other Limitations
 
- **Protocol Support**: HTTP/1.1, HTTP/2, and gRPC (no WebSockets or HTTP/3 yet)
- **Regional Service**: VPC Lattice operates within a single AWS Region
- **Authentication**: Only AWS IAM and no custom authentication providers
- **TLS**: TLS 1.2 and above only
 
Most quotas can be increased through AWS Support, but the architectural limitations remain fixed.
 
## When VPC Lattice May Not Be Ideal
 
Despite its many advantages, VPC Lattice isn't suitable for all use cases. Consider alternatives when your architecture includes:
 
### WebSocket Applications
- **Streaming Services**: Applications requiring persistent connections, like MCP (Model Context Protocol) servers that stream AI responses
- **Real-time Applications**: Chat applications, live dashboards, or collaborative tools
- **Workaround**: Possible but complex - requires deploying a WebSocket broker in front of VPC Lattice services
 
### Multi-Region Architectures
- **Global Applications**: Services that need to span multiple AWS regions
- **Disaster Recovery**: Cross-region failover scenarios requiring seamless networking
- **Workaround**: Deploy separate VPC Lattice service networks in each region with application-level routing
 
### Non-HTTP Protocols
- **TCP/UDP Traffic**: Applications using raw TCP or UDP protocols
- **Custom Protocols**: Proprietary communication protocols not based on HTTP
- **Workaround**: Use AWS PrivateLink or Transit Gateway for these communication patterns
 
### High-Volume Data Transfer
- **Large File Transfers**: The 1MB response size limit makes large data transfers inefficient
- **Workaround**: Use direct S3 access or other data transfer services
 
## A Demonstration!
 
This repository contains a complete AWS CDK application that demonstrates how to deploy a fully functioning VPC Lattice stack. The demo includes both Lambda and Application Load Balancer (ALB) services connected through VPC Lattice.
 
### Architecture Overview
 
The CDK application deploys:
 
1. **VPC Infrastructure**
   - Private subnets across multiple availability zones
   - VPC endpoints for AWS services (ECR, CloudWatch Logs, S3)
   - Security groups for controlled access
 
2. **VPC Lattice Service Network**
   - Centralized service network with access logging
   - VPC associations with appropriate security groups
   - DNS configuration for service discovery
 
3. **Lambda Service**
   - Node.js Lambda function deployed in VPC
   - VPC Lattice service association
   - IAM permissions for VPC Lattice integration
 
4. **Container-based Service**
   - ECS Fargate service with ARM64 Graviton containers
   - Application Load Balancer as the target
   - Auto-scaling configuration
   - CloudWatch logging integration
 
### VPC Lattice Demo Architecture Diagram
 
![medium](https://assets.rainmaking.cloud/images/diagram-highlevel-arch.png)
 
#### Key Architectural Benefits Demonstrated:
 
1. **Network Isolation**: Workloads run in private subnets with no internet access
2. **Service Mesh**: VPC Lattice provides Layer 7 routing and service discovery
3. **Multi-Compute**: Shows both serverless (Lambda) and containerized (Fargate) services
4. **AWS Integration**: VPC endpoints enable private access to AWS services
5. **Observability**: Access logging and CloudWatch integration
6. **Security**: IAM-based authentication and security group controls
 
#### Traffic Flow:
 
1. Client in Default VPC makes request to service through VPC Lattice
2. VPC Lattice routes request based on service name and path
3. For container service: Request → ALB → ECS Fargate task
4. For Lambda service: Request directly to Lambda function
5. Services can communicate with each other through VPC Lattice
6. All AWS service calls go through private VPC endpoints
 
### Key Implementation Details
 
The CDK code demonstrates several best practices:
 
- **Modular Design**: Each component is implemented as a separate construct
- **Security First**: IAM policies follow least privilege principle
- **Observability**: Integrated logging and monitoring
- **Infrastructure as Code**: Complete deployment automation
 
### Deployment Instructions
 
To deploy this demonstration:
 
```bash
# Install dependencies
npm install
 
# Bootstrap CDK (if first time)
cdk bootstrap
 
# Deploy the stack
cdk deploy
```
 
After deployment, you can access both services through their VPC Lattice endpoints, demonstrating seamless service-to-service communication across different compute paradigms (serverless and container-based).
 
## Understanding the Cost Structure
 
Estimating costs for service networking solutions requires understanding several pricing dimensions. Here's how VPC Lattice pricing compares to alternative approaches:
 
### VPC Lattice Pricing Dimensions
 
1. **Service Network Hourly Charge**
   - Fixed hourly fee for each service network ($0.10/hour)
   - Approximately $73 per month per service network
 
2. **VPC Association Hourly Charge**
   - Fixed hourly fee for each VPC associated with a service network ($0.05/hour)
   - Approximately $36.50 per month per VPC association
 
3. **Data Processing Charges**
   - $0.25 per GB for the first 100 TB/month
   - Tiered pricing with volume discounts for higher usage
   - Charged for both inbound and outbound traffic through the service network
 
4. **Request Charges**
   - $0.10 per 1 million requests
   - Each API call to a service through VPC Lattice counts as a request
 
5. **Access Logging**
   - Standard CloudWatch Logs pricing applies if you enable access logging
   - Consider log storage and data transfer costs
 
### Cost Optimization Strategies
 
- **Consolidate Service Networks**: Use fewer service networks with more services per network
- **Minimize Cross-AZ Traffic**: Deploy services in the same Availability Zones to reduce data transfer costs
- **Monitor Data Processing**: Track data volume to identify optimization opportunities
- **Selective Logging**: Configure logging only for critical services
 
### Comparative Analysis
 
#### VPC Peering
- **Pros**: No hourly charges, only standard data transfer fees
- **Cons**: Requires more complex networking setup and management
- **Best for**: Simple point-to-point connectivity with low management overhead
 
#### Transit Gateway
- **Hourly attachment fee**: $0.05/hour per attachment
- **Data processing**: $0.02/GB
- **Best for**: Hub-and-spoke network architectures connecting many VPCs
 
#### AWS PrivateLink
- **VPC endpoint fee**: $0.01/hour per endpoint
- **Data processing**: $0.01/GB
- **Protocol support**: Any TCP traffic (Layer 4)
- **Use case**: Private access to AWS services or third-party SaaS
- **Best for**: Secure connectivity to external services without internet routing
 
#### VPC Lattice
- **Higher base cost** but includes advanced Layer 7 features
- **Protocol support**: HTTP/HTTPS only
- **Use case**: Internal microservices communication with advanced routing
- **Best for**: Applications requiring Layer 7 routing, authentication, and observability
 
## Conclusions
 
Application modernization should always look beyond the workload architecture. Ensuring sound networking is as important as the workload itself and VPC Lattice does simplify a lot of the decisions. Choose this option over peering or transit gateway for micro services architecture when Layer 7 capabilities are required and platform scalability is paramount. As always, when calculating total cost of ownership, consider not just the direct AWS charges but also the operational overhead, security benefits, and development efficiency that each solution provides.
