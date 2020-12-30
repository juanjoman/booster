import { BoosterConfig } from '@boostercloud/framework-types'
import { restore } from 'sinon'
import { expect } from '@boostercloud/cli/test/expect'
import { ElasticFileSystemStack } from '../src/elastic-filesystem-stack'

describe('Elastic filesystem creation', () => {
  const config = new BoosterConfig('test')
  config.appName = 'testing-app'

  afterEach(() => {
    restore()
  })

  context('when no params are passed', () => {

  });
})
