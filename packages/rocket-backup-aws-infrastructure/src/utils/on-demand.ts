import { Stack } from '@aws-cdk/core'
import { Table } from '@aws-cdk/aws-dynamodb'
import { BackupPlan, BackupResource, BackupPlanRule } from '@aws-cdk/aws-backup'
import { Schedule, CronOptions } from '@aws-cdk/aws-events'
import { BackupStackParams } from '../backup-stack'

export const applyOnDemandBackup = (stack: Stack, tables: Array<Table>, params: BackupStackParams): void => {
  // Modifiable on future versions. Other options available:
  // - daily35DayRetention
  // - dailyWeeklyMonthly5YearRetention
  // - dailyWeeklyMonthly7YearRetention
  const plan = BackupPlan.dailyMonthly1YearRetention(stack, 'BackupPlan')
  const backupResources = tables.map((table: Table) => {
    return BackupResource.fromDynamoDbTable(table)
  }) as Array<BackupResource>

  plan.addSelection('BackupSelection', {
    resources: backupResources,
  })

  if (params.onDemandBackupOptions?.schedule) {
    addScheduleRule(plan, params.onDemandBackupOptions.schedule)
  }
}

// Exported for testing
export const addScheduleRule = (plan: BackupPlan, schedule: CronOptions): void => {
  plan.addRule(
    new BackupPlanRule({
      scheduleExpression: Schedule.cron(schedule),
    })
  )
}
