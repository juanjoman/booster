import { Table } from '@aws-cdk/aws-dynamodb'

export const applyPointInTimeRecoveryBackup = (table: Table): void => {
  table.node['host'].table._cfnProperties.pointInTimeRecoverySpecification = {
    pointInTimeRecoveryEnabled: true,
  }
}
