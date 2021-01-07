import { BoosterConfig } from '@boostercloud/framework-types'
import { Fn, RemovalPolicy, Stack } from '@aws-cdk/core'
import { CfnAuthorizer, CfnIntegration, CfnIntegrationResponse, CfnRoute } from '@aws-cdk/aws-apigatewayv2'
import { Code, Function, IEventSource, FileSystem } from '@aws-cdk/aws-lambda'
import * as params from '../params'
import { APIs } from '../params'
import { ServicePrincipal, ManagedPolicy, Role } from '@aws-cdk/aws-iam'
import { AuthorizationType, LambdaIntegration } from '@aws-cdk/aws-apigateway'
import { Cors } from '@aws-cdk/aws-apigateway/lib/cors'
import { AttributeType, BillingMode, ProjectionType, Table } from '@aws-cdk/aws-dynamodb'
import { connectionsStoreAttributes, subscriptionsStoreAttributes } from '@boostercloud/framework-provider-aws'
import { DynamoEventSource } from '@aws-cdk/aws-lambda-event-sources'
import { UserPool } from '@aws-cdk/aws-cognito'
import { Vpc } from '@aws-cdk/aws-ec2'
import { FileSystem as EFSfilesystem, AccessPoint, LifecyclePolicy, ThroughputMode } from '@aws-cdk/aws-efs'

export interface GraphQLStackMembers {
  graphQLLambda: Function
  subscriptionDispatcherLambda: Function
  subscriptionsStore: Table
  connectionsStore: Table
}

export class GraphQLStack {
  public constructor(
    private readonly config: BoosterConfig,
    private readonly stack: Stack,
    private readonly apis: APIs,
    private readonly readModelTables: Array<Table>,
    private readonly userPool?: UserPool
  ) {}

  public build(): GraphQLStackMembers {
    const vpc = new Vpc(this.stack, 'ElasticFileSystemVPC')
    console.log("/////////////////// ADIOS VPC ///////////////////")
    // Lifecycle policy explained
    // EFS has two ways of storing files:
    // 1. EFS Standard.
    // 2. EFS IA (infrecuent access) - way cheaper - https://aws.amazon.com/es/efs/features/infrequent-access/
    // With the config below, if a file isn't accessed in 7 days, it's moved to EFS IA.
    const fileSystem = new EFSfilesystem(this.stack, 'ElasticFileSystem', {
      vpc, // Required param
      fileSystemName: 'myFileSystem',
      lifecyclePolicy: LifecyclePolicy.AFTER_7_DAYS,
      throughputMode: ThroughputMode.BURSTING,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    console.log("/////////////////// ADIOS FILESYSTEM ///////////////////")
    const accessPoint = new AccessPoint(this.stack, 'ElasticFileSystem-AccessPoint', {
      fileSystem,
      path: '/mnt/efs',
      createAcl: {
        ownerUid: '1001',
        ownerGid: '1001',
        permissions: '777'
      },
      posixUser: {
        uid: '1001',
        gid: '1001'
      }
    })
    console.log("/////////////////// LALA ///////////////////")
    const lambdaRole = new Role(this.stack, 'ElasticFileSystemLambdaRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com')
    })
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonElasticFileSystemClientFullAccess'))
    lambdaRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'))
    const graphQLLambda = this.buildLambda('graphql-handler', this.config.serveGraphQLHandler, vpc, accessPoint, lambdaRole)
    console.log("ADIOS GRAPHQL")
    const readModelsEventSources = this.buildEventSourcesForTables(this.readModelTables)
    console.log("READ MODELS ADIOS")
    const subscriptionDispatcherLambda = this.buildLambda(
      'subscriptions-notifier',
      this.config.notifySubscribersHandler,
      vpc,
      accessPoint,
      lambdaRole,
      readModelsEventSources
    )
    console.log("SUBSCRIPTIONS ADIOS")
    this.buildWebsocketRoutes(graphQLLambda)
    this.buildRESTRoutes(graphQLLambda)
    const subscriptionsStore = this.buildSubscriptionsTable()
    const connectionsStore = this.buildConnectionsTable()

    return { graphQLLambda, subscriptionDispatcherLambda, subscriptionsStore, connectionsStore }
  }

  private buildLambda(name: string, handler: string, vpc: Vpc, accessPoint: AccessPoint, lambdaRole: Role, eventSources?: Array<IEventSource>): Function {
    console.log("/////////////////// LELE ///////////////////")
    const lambda = new Function(this.stack, name, {
      ...params.lambda(this.config, this.stack, this.apis, this.userPool),
      functionName: `${this.config.resourceNames.applicationStack}-${name}`,
      handler: handler,
      code: Code.fromAsset(this.config.userProjectRootPath),
      events: eventSources,
      filesystem: FileSystem.fromEfsAccessPoint(accessPoint, '/mnt/efs'),
      vpc,
      role: lambdaRole,
    })
    console.log("/////////////////// LILI ///////////////////")
    lambda.addPermission(name + '-invocation-permission', {
      principal: new ServicePrincipal('apigateway.amazonaws.com'),
    })
    console.log("/////////////////// LOLO ///////////////////")
    return lambda
  }

  private buildEventSourcesForTables(readModelTables: Array<Table>): Array<DynamoEventSource> {
    return readModelTables.map((table) => new DynamoEventSource(table, params.stream()))
  }

  private buildWebsocketRoutes(graphQLLambda: Function): void {
    const lambdaIntegration = this.buildLambdaIntegration(graphQLLambda)

    this.buildRoute('$connect', lambdaIntegration)
    this.buildRoute('$default', lambdaIntegration)
    this.buildRoute('$disconnect', lambdaIntegration)
  }

  private buildLambdaIntegration(lambda: Function): CfnIntegration {
    const localID = 'graphql-handler-integration'
    const integration = new CfnIntegration(this.stack, localID, {
      apiId: this.apis.websocketAPI.ref,
      integrationType: 'AWS_PROXY',
      integrationUri: Fn.join('', [
        'arn:',
        Fn.ref('AWS::Partition'),
        ':apigateway:',
        Fn.ref('AWS::Region'),
        ':lambda:path/2015-03-31/functions/',
        lambda.functionArn,
        '/invocations',
      ]),
    })
    integration.addDependsOn(this.apis.websocketAPI)

    const integrationResponseLocalId = 'graphql-handler-integration-response'
    const integrationResponse = new CfnIntegrationResponse(this.stack, integrationResponseLocalId, {
      integrationId: integration.ref,
      apiId: this.apis.websocketAPI.ref,
      integrationResponseKey: '$default',
    })
    integrationResponse.addDependsOn(integration)
    return integration
  }

  private buildRoute(routeKey: string, integration: CfnIntegration, authorizer?: CfnAuthorizer): CfnRoute {
    const localID = `route-${routeKey}`
    const route = new CfnRoute(this.stack, localID, {
      apiId: this.apis.websocketAPI.ref,
      routeKey: routeKey,
      target: Fn.join('/', ['integrations', integration.ref]),
    })
    if (authorizer) {
      route.authorizationType = 'CUSTOM'
      route.authorizerId = authorizer.ref
    }
    route.addDependsOn(integration)
    return route
  }

  private buildRESTRoutes(graphQLLambda: Function): void {
    this.apis.restAPI.root
      .addResource('graphql', {
        defaultCorsPreflightOptions: {
          allowOrigins: Cors.ALL_ORIGINS,
        },
      })
      .addMethod('POST', new LambdaIntegration(graphQLLambda), {
        authorizationType: AuthorizationType.NONE,
      })
  }

  private buildSubscriptionsTable(): Table {
    const table = new Table(this.stack, this.config.resourceNames.subscriptionsStore, {
      tableName: this.config.resourceNames.subscriptionsStore,
      partitionKey: {
        name: subscriptionsStoreAttributes.partitionKey,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: subscriptionsStoreAttributes.sortKey,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: subscriptionsStoreAttributes.ttl,
    })
    table.addGlobalSecondaryIndex({
      indexName: subscriptionsStoreAttributes.indexByConnectionIDName(this.config),
      partitionKey: {
        name: subscriptionsStoreAttributes.indexByConnectionIDPartitionKey,
        type: AttributeType.STRING,
      },
      sortKey: {
        name: subscriptionsStoreAttributes.indexByConnectionIDSortKey,
        type: AttributeType.STRING,
      },
      projectionType: ProjectionType.KEYS_ONLY,
    })
    return table
  }

  private buildConnectionsTable(): Table {
    return new Table(this.stack, this.config.resourceNames.connectionsStore, {
      tableName: this.config.resourceNames.connectionsStore,
      partitionKey: {
        name: connectionsStoreAttributes.partitionKey,
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: RemovalPolicy.DESTROY,
      timeToLiveAttribute: connectionsStoreAttributes.ttl,
    })
  }
}
