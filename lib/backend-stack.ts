import { Construct } from 'constructs';
import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { DockerImageAsset, Platform } from 'aws-cdk-lib/aws-ecr-assets';
import { ApplicationLoadBalancedEc2Service } from 'aws-cdk-lib/aws-ecs-patterns';
import { AmiHardwareType, AsgCapacityProvider, Cluster, Compatibility, ContainerImage, Ec2TaskDefinition, EcsOptimizedImage, NetworkMode, Protocol } from 'aws-cdk-lib/aws-ecs';
import { InstanceType, LaunchTemplate, UserData, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AutoScalingGroup } from 'aws-cdk-lib/aws-autoscaling';
import { ManagedPolicy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';

export class BackendStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);

    const image = new DockerImageAsset(this, 'Image', {
        directory: '../forceteki',
        platform: Platform.LINUX_ARM64,
        buildArgs: {
            BUILDX_NO_DEFAULT_ATTESTATIONS: '1'
        },
    })
    const vpc = new Vpc(this, 'Vpc');

    const ecsCluster = new Cluster(this, 'EcsCluster', {
        vpc
    })

    const launchRole = new Role(this, 'LaunchTemplateRole', {
        managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess')],
        assumedBy: new ServicePrincipal('ec2.amazonaws.com')
    })

    const launchTemplate = new LaunchTemplate(this, 'LaunchTemplate', {
        instanceType: new InstanceType('t4g.small'),
        machineImage: EcsOptimizedImage.amazonLinux2(AmiHardwareType.ARM),
        userData: UserData.forLinux(),
        role: launchRole,
    })

    const autoScalingGroup = new AutoScalingGroup(this, 'AusoScalingGroup', {
        vpc,
        launchTemplate,
        desiredCapacity: 1,
        minCapacity: 1,
        maxCapacity: 1
    })

    const capacityProvider = new AsgCapacityProvider(this, 'capacityProvider', {
        autoScalingGroup,
    });

    ecsCluster.addAsgCapacityProvider(capacityProvider);

    const taskDef = new Ec2TaskDefinition(
        this,
        'taskDef',
    )
    const container = taskDef.addContainer('Container', {
        image: ContainerImage.fromDockerImageAsset(image),
        memoryLimitMiB: 512,
        healthCheck: {
            command: [ "CMD-SHELL", "curl -f http://localhost/api/health || exit 1" ],
            // the properties below are optional
            interval: Duration.minutes(5),
            retries: 3,
            startPeriod: Duration.minutes(5),
            timeout: Duration.seconds(30),
        }
    })
    container.addPortMappings({
        containerPort: 9500,
        protocol: Protocol.TCP
    })

    const karabastEcs = new ApplicationLoadBalancedEc2Service(this, 'KarabastService', {
        taskDefinition: taskDef,
        publicLoadBalancer: true,
        memoryLimitMiB: 1024,
        cluster: ecsCluster
    });
  }
}
