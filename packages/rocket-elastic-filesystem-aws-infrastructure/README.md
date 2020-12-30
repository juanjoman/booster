# Elastic FileSystem Rocket for AWS

This package is a configurable Booster rocket to connect a filesystem to your Booster Framework application. This can be useful for tasks such as file processing and temporal file storage.

## Usage

Install this package as a dev dependency in your Booster project (It's a dev dependency because it's only used during deployment, but we don't want this code to be uploaded to the project lambdas)

```sh
yarn add --dev @boostercloud/elastic-filesystem-aws-infrastructure
```

In your Booster config file, pass a `RocketDescriptor` array to the AWS' `Provider` initializer:

```typescript
import { Booster } from '@boostercloud/framework-core'
import { BoosterConfig } from '@boostercloud/framework-types'
import * as AWS from '@boostercloud/framework-provider-aws'

Booster.configure('development', (config: BoosterConfig): void => {
  config.appName = 'my-store'
  config.provider = Provider([{
    packageName: '@boostercloud/elastic-filesystem-aws-infrastructure', 
    parameters: {
      fileSystemName: 'myFileSystemName', // Required
      path: '/var/tmp/myPath' // Accessible path from commands, events, etc. Default path is /efs
    }
  }])
})
```
