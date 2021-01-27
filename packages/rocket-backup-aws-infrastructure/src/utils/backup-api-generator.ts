import { Stack } from '@aws-cdk/core'
import { Function } from '@aws-cdk/aws-lambda'
import { Table } from '@aws-cdk/aws-dynamodb'
import { Bucket } from '@aws-cdk/aws-s3'
import { LambdaRestApi } from '@aws-cdk/aws-apigateway'

export const buildAPI = (stack: Stack, backend: Function, tableToBucket: Map<Table, Bucket>): void => {
  // API authentication??
  // - Verify token
  // - Check if is admin (BoosterAuth)
  // - If not, throw error
  const api = new LambdaRestApi(stack, 'exportToS3API', {
    handler: backend,
  })
  // List all backups (quick summary, just the info needed for the backend lambda to fetch a specific lambda
  const backupAPIRoot = api.root.addResource('backups')
  backupAPIRoot.addMethod('GET')
  // Different options:
  // - Get the backup content as a JSON (time consuming if the table had too much content)
  // -
  const exportAPIRoot = backupAPIRoot.addResource('{id}')
  exportAPIRoot.addMethod('GET')
}
