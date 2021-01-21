import { Stack } from '@aws-cdk/core'
import { Table } from '@aws-cdk/aws-dynamodb'
import { BackupPlan, BackupResource, BackupPlanRule } from '@aws-cdk/aws-backup'
import { Schedule } from '@aws-cdk/aws-events'
import { BackupStackParams, OnDemandBackupRules } from '../backup-stack'

export const applyOnDemandBackup = (stack: Stack, params: BackupStackParams, table: Table): void => {
  // Modifiable on future versions. Other options available:
  // - daily35DayRetention
  // - dailyWeeklyMonthly5YearRetention
  // - dailyWeeklyMonthly7YearRetention
  const plan = BackupPlan.dailyMonthly1YearRetention(stack, 'BackupPlan')
  plan.addSelection('BackupSelection', {
    resources: [BackupResource.fromDynamoDbTable(table)],
  })

  if (params.onDemandBackupRules) {
    addAdditionalRules(plan, params.onDemandBackupRules)
  }
}

// Exported for testing
export const addAdditionalRules = (plan: BackupPlan, rulesParams: OnDemandBackupRules): void => {
  plan.addRule(
    new BackupPlanRule({
      scheduleExpression: Schedule.cron({
        minute: rulesParams.minute,
        hour: rulesParams.hour,
        day: rulesParams.day,
        month: rulesParams.month,
        weekDay: rulesParams.weekDay,
        year: rulesParams.year,
      }),
    })
  )
}
