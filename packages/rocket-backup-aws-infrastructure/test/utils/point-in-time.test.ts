import { BoosterConfig } from '@boostercloud/framework-types'
import { App, Stack, StackProps } from '@aws-cdk/core'
import { applyPointInTimeRecoveryBackup } from '../../src/utils/point-in-time-recovery'
import { expect } from '../expect'
import { generateDynamoDBTable } from './resource-generator'

describe('Point in time recovery utils', () => {
  const config = new BoosterConfig('test')
  config.appName = 'testing-app'
  const appStack = new Stack(new App(), config.resourceNames.applicationStack, {} as StackProps)

  it('sets the pointInTimeRecoverySpecification parameter to true', () => {
    const table = generateDynamoDBTable(appStack)

    // 'pointInTimeRecovery: false' does not set pointInTimeRecoverySpecification
    expect(table.node['host'].table._cfnProperties.pointInTimeRecoverySpecification).to.be.undefined

    applyPointInTimeRecoveryBackup(table)

    expect(table.node['host'].table._cfnProperties.pointInTimeRecoverySpecification).to.not.be.undefined
    expect(table.node['host'].table._cfnProperties.pointInTimeRecoverySpecification.pointInTimeRecoveryEnabled).true
  })
})
