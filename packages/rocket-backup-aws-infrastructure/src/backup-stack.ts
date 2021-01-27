import { Stack, IConstruct } from '@aws-cdk/core'
import { Table } from '@aws-cdk/aws-dynamodb'
import { RocketUtils } from '@boostercloud/framework-provider-aws-infrastructure'
import { applyPointInTimeRecoveryBackup } from './utils/point-in-time-recovery'
import { applyOnDemandBackup } from './utils/on-demand'
import { BackupType, OnDemandBackupOptions, PointInTimeBackupOptions } from './utils/types'

export type BackupStackParams = {
  backupType: BackupType
  onDemandBackupOptions?: OnDemandBackupOptions
  pointInTimeBackupOptions?: PointInTimeBackupOptions
}

export class BackupStack {
  public static mountStack(params: BackupStackParams, stack: Stack): void {
    if (BackupType[params.backupType]) {
      const tables = stack.node.children.filter((c: IConstruct) => c instanceof Table) as Array<Table>
      if (params.backupType === BackupType.ON_DEMAND) {
        applyOnDemandBackup(stack, tables, params)
      } else {
        applyPointInTimeRecoveryBackup(stack, tables, params)
      }
    } else {
      throw Error(
        '[Rocket][Backup] - backupType parameter is missing or is not supported. The available backup types are ON_DEMAND and POINT_IN_TIME'
      )
    }
  }

  public static async unmountStack(params: BackupStackParams, utils: RocketUtils): Promise<void> {
    // Nothing to do
  }
}
