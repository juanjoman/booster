import { Stack, RemovalPolicy } from '@aws-cdk/core'
import { Table } from '@aws-cdk/aws-dynamodb'
import { Function, Runtime, Code } from '@aws-cdk/aws-lambda'
import { Bucket } from '@aws-cdk/aws-s3'
import { BackupStackParams } from '../backup-stack'
import { buildAPI } from './backup-api-generator'

export const applyPointInTimeRecoveryBackup = (stack: Stack, tables: Array<Table>, params: BackupStackParams): void => {
  tables.map((table: Table) => {
    table.node['host'].table.pointInTimeRecoverySpecification = {
      pointInTimeRecoveryEnabled: true,
    }
  })

  if (params.pointInTimeBackupOptions?.exportToS3) {
    createExportToS3Endpoint(stack, tables)
  }
}

// 'Export to S3' feature requires the bucket to be previously created,
// so we map tables with buckets to send this relation to the lambda
const createExportToS3Endpoint = (stack: Stack, tables: Array<Table>): void => {
  // DO THIS ON THE LAMBDA, USING THE SDK.
  const tableToBucket = assignTableToS3(stack, tables) as Map<Table, Bucket>
  const backend = new Function(stack, 'ExportToS3Backend', {
    runtime: Runtime.NODEJS_12_X,
    handler: 'index.handler',
    code: Code.fromAsset(`${__dirname}/src/lambda`),
  })

  buildAPI(stack, backend, tableToBucket)
}

const assignTableToS3 = (stack: Stack, tables: Array<Table>): Map<Table, Bucket> => {
  const map = new Map<Table, Bucket>()
  tables.map((table: Table) => {
    const tableName = table.node['host'].physicalName
    const bucket = new Bucket(stack, `${tableName}-backup-bucket`, {
      bucketName: `${tableName}-backup-bucket`,
      removalPolicy: RemovalPolicy.DESTROY,
    })
    map.set(table, bucket)
  })

  return map
}
