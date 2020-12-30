import { IConstruct, Stack, RemovalPolicy } from '@aws-cdk/core'
import { RocketUtils } from '@boostercloud/framework-provider-aws-infrastructure'
import { FileSystem, AccessPoint, LifecyclePolicy, ThroughputMode } from '@aws-cdk/aws-efs'
import { Role, ServicePrincipal, ManagedPolicy } from '@aws-cdk/aws-iam'
import { Vpc } from '@aws-cdk/aws-ec2'
import { Function, CfnFunction } from '@aws-cdk/aws-lambda'

export type AWSElasticFilesystemParams = {
  fileSystemName: string
  path?: string
}

export class ElasticFileSystemStack {
  public static mountStack(params: AWSElasticFilesystemParams, stack: Stack): void {
    const vpc = new Vpc(stack, 'ElasticFileSystemVPC')
    // EFS has two ways of storing files:
    // 1. EFS Standard.
    // 2. EFS IA (infrecuent access) - way cheaper - https://aws.amazon.com/es/efs/features/infrequent-access/
    // With the config below, if a file isn't accessed in 7 days, it's moved to EFS IA.
    const fileSystem = new FileSystem(stack, 'ElasticFileSystem', {
      vpc, // Required param
      fileSystemName: params.fileSystemName,
      lifecyclePolicy: LifecyclePolicy.AFTER_7_DAYS,
      throughputMode: ThroughputMode.BURSTING,
      removalPolicy: RemovalPolicy.DESTROY,
    })

    const accessPoint = new AccessPoint(stack, 'ElasticFileSystem-AccessPoint', {
      fileSystem,
      path: '/mnt/efs',
    })

    const lambdaRole = new Role(stack, 'ElasticFileSystemLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    })
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticFileSystemClientFullAccess'))
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'))

    // MISSING: Setting VPC and lambdaRole
    const eventMainLambda = stack.node.tryFindChild('events-main') as Function
    console.log('///////// LAMBDA /////////')
    console.log(eventMainLambda)

    const cfnFunction = eventMainLambda.node.children.filter(
      (c: IConstruct) => c instanceof CfnFunction
    )[0] as CfnFunction

    // fileSystemConfigs from CfnFunction access Function FileSystemConfigs.
    // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-filesystemconfig.html
    // fileSystemConfig: Array<CfnFunction.FileSystemConfigProperty | (...other generic types)>
    // https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-lambda.CfnFunction.FileSystemConfigProperty.html
    cfnFunction.fileSystemConfigs = [
      {
        arn: accessPoint.accessPointArn,
        localMountPath: '/mnt/efs',
      },
    ] as Array<CfnFunction.FileSystemConfigProperty>
  }

  public static async unmountStack(params: AWSElasticFilesystemParams, utils: RocketUtils): Promise<void> {
    // Removal policy is set to DESTROY, so the filesystem gets automatically deleted
  }
}
