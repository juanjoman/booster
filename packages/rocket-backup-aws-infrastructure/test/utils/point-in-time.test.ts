import { BoosterConfig } from '@boostercloud/framework-types'
import { App, Stack, StackProps } from '@aws-cdk/core'
import { Table } from '@aws-cdk/aws-dynamodb'
import { applyPointInTimeRecoveryBackup } from '../../src/utils/point-in-time-recovery'
import { expect } from '../expect'
import { generateDynamoDBTable } from './resource-generator'
import { BackupType } from '../../src/utils/types'
import { BackupStackParams } from '../../src/backup-stack'

describe('Point in time recovery utils', () => {
  const config = new BoosterConfig('test')
  config.appName = 'testing-app'
  const appStack = new Stack(new App(), config.resourceNames.applicationStack, {} as StackProps)
  let params = { backupType: BackupType.POINT_IN_TIME } as BackupStackParams

  it('sets the pointInTimeRecoverySpecification parameter to true', () => {
    const tables = Array.from(Array(3)).map((_, i) => {
      return generateDynamoDBTable(appStack, `myTable-${i}`, `tableName-${i}`)
    })

    tables.map((table: Table) => {
      // 'pointInTimeRecovery: false' does not set pointInTimeRecoverySpecification
      expect(table.node['host'].table.pointInTimeRecoverySpecification).to.be.undefined
    })

    applyPointInTimeRecoveryBackup(appStack, tables, params)

    tables.map((table: Table) => {
      expect(table.node['host'].table.pointInTimeRecoverySpecification).to.not.be.undefined
      expect(table.node['host'].table.pointInTimeRecoverySpecification.pointInTimeRecoveryEnabled).true
    })
  })

  it('sets the pointInTimeRecoverySpecification parameter to true and triggers export to S3 feature', () => {
    params = { ...params, pointInTimeBackupOptions: { exportToS3: true } }

    const tables = Array.from(Array(3)).map((_, i) => {
      return generateDynamoDBTable(appStack, `myTable-${i}`, `tablename-${i}`)
    })

    tables.map((table: Table) => {
      // 'pointInTimeRecovery: false' does not set pointInTimeRecoverySpecification
      expect(table.node['host'].table.pointInTimeRecoverySpecification).to.be.undefined
    })

    applyPointInTimeRecoveryBackup(appStack, tables, params)

    tables.map((table: Table) => {
      expect(table.node['host'].table.pointInTimeRecoverySpecification).to.not.be.undefined
      expect(table.node['host'].table.pointInTimeRecoverySpecification.pointInTimeRecoveryEnabled).true
    })
  })
})
