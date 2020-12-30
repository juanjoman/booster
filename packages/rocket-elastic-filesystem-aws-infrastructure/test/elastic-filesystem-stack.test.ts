import { Stack, App, StackProps } from '@aws-cdk/core'
import { Code, Function, Runtime } from '@aws-cdk/aws-lambda'
import { BoosterConfig } from '@boostercloud/framework-types'
import { restore } from 'sinon'
import { ElasticFileSystemStack } from '../src/elastic-filesystem-stack'

describe('Elastic filesystem creation', () => {
  const config = new BoosterConfig('test')
  config.appName = 'testing-app'
  const appStack = new Stack(new App(), config.resourceNames.applicationStack, {} as StackProps)

  afterEach(() => {
    restore()
  })

  context('when no params are passed', () => {
    new Function(appStack, `${appStack.stackName}-events-main`, {
      handler: 'index.handler',
      code: Code.fromInline('process.cwd()'),
      runtime: Runtime.NODEJS_12_X,
    })
    ElasticFileSystemStack.mountStack({ fileSystemName: 'myFileSystem' }, appStack)
  })
})
