import { CronOptions } from '@aws-cdk/aws-events'

export enum BackupType {
  ON_DEMAND,
  POINT_IN_TIME,
}

export type OnDemandBackupOptions = {
  schedule: CronOptions
}

export type PointInTimeBackupOptions = {
  exportToS3?: boolean
}
