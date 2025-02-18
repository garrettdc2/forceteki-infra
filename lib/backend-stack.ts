import { Construct } from 'constructs';
import { Stack, StackProps } from 'aws-cdk-lib';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ApplicationLoadBalancedFargateService } from 'aws-cdk-lib/aws-ecs-patterns';
import { Cluster, ContainerImage } from 'aws-cdk-lib/aws-ecs';
import { Vpc } from 'aws-cdk-lib/aws-ec2';

/**
 * Contains the infra for the Karabast server.
 */
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
    })

    service.targetGroup.configureHealthCheck({
      path: "/api/health"
    })
  }
}
