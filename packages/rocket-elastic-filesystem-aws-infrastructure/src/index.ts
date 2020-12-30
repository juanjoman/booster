import { AWSElasticFilesystemParams, ElasticFileSystemStack } from './elastic-filesystem-stack'
import { InfrastructureRocket } from '@boostercloud/framework-provider-aws-infrastructure'

const AWSElasticFileSystem = (params: AWSElasticFilesystemParams): InfrastructureRocket => ({
  mountStack: ElasticFileSystemStack.mountStack.bind(null, params),
  unmountStack: ElasticFileSystemStack.unmountStack.bind(null, params),
})

export default AWSElasticFileSystem
