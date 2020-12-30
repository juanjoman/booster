import { Stack, RemovalPolicy } from '@aws-cdk/core'
import { RocketUtils } from '@boostercloud/framework-provider-aws-infrastructure'
import { FileSystem, AccessPoint, LifecyclePolicy, ThroughputMode } from '@aws-cdk/aws-efs'
import { Vpc } from '@aws-cdk/aws-ec2'
import * as lambda from '@aws-cdk/aws-lambda'

export type AWSElasticFilesystemParams = {
  fileSystemName: string
  path?: string
}

export class ElasticFileSystemStack {
  public static mountStack(params: AWSElasticFilesystemParams, stack: Stack): void {
    const vpc = new Vpc(stack, 'ElasticFileSystemVPC')
    // Lifecycle policy explained
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
      path: params.path ?? '/efs',
    })

    new lambda.Function(stack, 'ElasticFileSystemLambda', {
      handler: 'elastic-file-system-lambda.handler',
      code: lambda.Code.fromAsset('./elastic-filesystem-lambda.ts'),
      runtime: lambda.Runtime.NODEJS_12_X,
      filesystem: lambda.FileSystem.fromEfsAccessPoint(accessPoint, '/efs'),
      vpc,
    })
  }

  public static async unmountStack(params: AWSElasticFilesystemParams, utils: RocketUtils): Promise<void> {
    // Removal policy is set to DESTROY, so the filesystem gets automatically deleted
  }
}
