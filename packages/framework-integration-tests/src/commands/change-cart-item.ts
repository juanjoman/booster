import { Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'
import { CartItemChanged } from '../events/cart-item-changed'
import { exec } from 'child-process-promise'
import { existsSync } from 'fs'
const cli = require('@boostercloud/cli/dist/index')

@Command({
  authorize: 'all',
})
export class ChangeCartItem {
  public constructor(readonly cartId: UUID, readonly productId: UUID, readonly quantity: number) {}

  public static async handle(command: ChangeCartItem, register: Register): Promise<void> {
    process.env['PATH'] = process.env['PATH'] + ':/var/task/node_modules/yarn/bin'
    await exec('yarn -v').then(res => console.log("YARN VERSION =>", res.stdout))
    await exec('npx yarn -v').then(res => console.log("YARN VERSION 2 =>", res.stdout))
    
    await process.chdir('/mnt/efs')
    // REMINDER: INCREASE GRAPHQL-HANDLER TIMEOUT TO 15min JUST IN CASE DEPLOY TAKES TOO MUCH TIME
    if (existsSync('/mnt/efs/booster-inside-booster-mindblow')) {
      await exec('rm -rf /mnt/efs/booster-inside-booster-mindblow')
    }
    await cli.run(['new:project', 'booster-inside-booster-mindblow', '--default', '--skipGit'])
    await exec('ls', { cwd: '/mnt/efs/booster-inside-booster-mindblow' }).then(res => {
      console.log("Booster framework app content is ->" + res.stdout)
    })
    
    await register.events(new CartItemChanged(command.cartId, command.productId, command.quantity))
  }
}
