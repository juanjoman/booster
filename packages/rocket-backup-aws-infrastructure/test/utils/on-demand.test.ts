import { BoosterConfig } from '@boostercloud/framework-types'
import { App, Stack, StackProps } from '@aws-cdk/core'
import { BackupPlan, BackupResource } from '@aws-cdk/aws-backup'
import { Table } from '@aws-cdk/aws-dynamodb'
import * as OnDemandUtils from '../../src/utils/on-demand'
import { BackupType } from '../../src/backup-stack'
import { generateDynamoDBTable } from './resource-generator'
import { spy, restore } from 'sinon'
import { expect } from '../expect'

describe('On demand utils', () => {
  const config = new BoosterConfig('test')
  config.appName = 'testing-app'
  let appStack: Stack
  let table: Table
  const backUpPlanID = 'BackupPlan'
  const backupSelectionID = 'BackupSelection'

  beforeEach(() => {
    restore()
    appStack = new Stack(new App(), config.resourceNames.applicationStack, {} as StackProps)
    table = generateDynamoDBTable(appStack)
  })

  it('creates a backup plan when no rules have been provided through the onDemandBackupRules parameter', () => {
    const params = { backupType: BackupType.ON_DEMAND }
    const backupPlanSpy = spy(BackupPlan, 'dailyMonthly1YearRetention')
    const backupPlanAddSelectionSpy = spy(BackupPlan.prototype, 'addSelection')
    // Spying on this method separately because dailyMonthly1YearRetention already triggers "BackupPlan.addRule(...)" twice
    const backupPlanAddRuleSpy = spy(OnDemandUtils, 'addAdditionalRules')

    OnDemandUtils.applyOnDemandBackup(appStack, params, table)

    expect(backupPlanSpy).to.have.been.calledOnceWithExactly(appStack, backUpPlanID)
    expect(backupPlanAddSelectionSpy).to.have.been.calledOnceWithExactly(backupSelectionID, {
      resources: [BackupResource.fromDynamoDbTable(table)],
    })
    expect(backupPlanAddRuleSpy).to.not.have.been.called
  })

  it('creates a backup plan when all rules have been provided through the onDemandBackupRules parameter', () => {
    // Weekday is missing since it can't be set with the 'day' parameter
    const onDemandBackupRules = {
      minute: '40',
      hour: '18',
      day: '10',
      month: '6',
      year: '2021',
    }
    const params = {
      backupType: BackupType.ON_DEMAND,
      onDemandBackupRules,
    }
    const backupPlanSpy = spy(BackupPlan, 'dailyMonthly1YearRetention')
    const backupPlanAddSelectionSpy = spy(BackupPlan.prototype, 'addSelection')
    // Spying on this method separately because dailyMonthly1YearRetention already triggers "BackupPlan.addRule(...)" twice
    const backupPlanAddRuleSpy = spy(OnDemandUtils, 'addAdditionalRules')

    OnDemandUtils.applyOnDemandBackup(appStack, params, table)

    expect(backupPlanSpy).to.have.been.calledOnceWithExactly(appStack, backUpPlanID)
    expect(backupPlanAddSelectionSpy).to.have.been.calledOnceWithExactly(backupSelectionID, {
      resources: [BackupResource.fromDynamoDbTable(table)],
    })
    expect(backupPlanAddRuleSpy).to.have.been.calledOnceWithExactly(backupPlanSpy.returnValues[0], onDemandBackupRules)
  })
})
