import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ApplicationLoadBalancer, ListenerAction, ApplicationListener } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Certificate } from 'aws-cdk-lib/aws-certificatemanager';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Cluster, ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const image = new DockerImageAsset(this, 'Image', {
        directory: '../forceteki',
        platform: Platform.LINUX_AMD64,
        buildArgs: {
            BUILDX_NO_DEFAULT_ATTESTATIONS: '1'
        },
    })
    const vpc = new Vpc(this, 'Vpc');

    const ecsCluster = new Cluster(this, 'EcsCluster', {
        vpc
    })

    const certificate = Certificate.fromCertificateArn(this, "SSLCert", "arn:aws:acm:us-east-1:182399701650:certificate/8f910147-045a-4e88-a04c-494d5cd2980d");

    const service = new ApplicationLoadBalancedFargateService(this, "Service", {
      serviceName: 'karabast-service',
      loadBalancerName: 'karabast-alb',
      cluster: ecsCluster,
      memoryLimitMiB: 4096, // 4 GB
      cpu: 2048, // 2 vCPU
      taskImageOptions: {
          image: ContainerImage.fromDockerImageAsset(image),
          containerPort: 9500
      },
      desiredCount: 1,
      certificate: certificate,
      redirectHTTP: true,
    })

    service.targetGroup.configureHealthCheck({
      path: "/api/health",
      port: "9500",
    });    
  }
}
