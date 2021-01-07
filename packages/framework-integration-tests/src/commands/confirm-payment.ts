import { Command } from '@boostercloud/framework-core'
import { Register, UUID } from '@boostercloud/framework-types'
import { CartPaid } from '../events/cart-paid'
import { exec } from 'child-process-promise'
import { existsSync } from 'fs'
const cli = require('@boostercloud/cli/dist/index')
const request = require('request');
const tar = require('tar');

/**
 * Most payment platforms like PayPal have callbacks to confirm payment.
 * Ideally, we should set this command URL as the payment method callback URL
 */
@Command({
  authorize: 'all',
})
export class ConfirmPayment {
  public constructor(readonly paymentId: UUID, readonly cartId: UUID, readonly confirmationToken: string) {}

  public static async handle(command: ConfirmPayment, register: Register): Promise<void> {
    process.env['PATH'] = process.env['PATH'] + ':/var/task/node_modules/yarn/bin' + ':var/task/node_modules/rimraf/rimraf.js'
    /*if (!existsSync('/mnt/efs/caches')) {
      await exec('mkdir /mnt/efs/caches')
    }
    await exec('ls', { cwd: '/mnt/efs' }).then(res => {
      console.log("/MNT/EFS ->" + res.stdout)
    })
    await exec('yarn config set cache-folder /mnt/efs/caches')*/
    await exec('yarn -v').then(res => console.log("YARN VERSION =>", res.stdout))
    await exec('npx yarn -v').then(res => console.log("YARN VERSION 2 =>", res.stdout))
    
    if (!existsSync('/mnt/efs/booster-blog')) {
      await process.chdir('/mnt/efs/')
      const url = "https://juanjo-temp-bucket.s3-eu-west-1.amazonaws.com/boosted-blog.tar.gz";
      await request(url).pipe(tar.x())
    }

    await exec('ls', { cwd: '/mnt/efs' }).then(res => {
      console.log("/MNT/EFS ->" + res.stdout)
    })
    await exec('ls', { cwd: '/mnt/efs/boosted-blog' }).then(res => {
      console.log("Boosted Blog ->" + res.stdout)
    })
    
    await process.chdir('/mnt/efs/boosted-blog')

    await cli.run(['deploy', '-e', 'production'])
    register.events(new CartPaid(command.paymentId, command.cartId, command.confirmationToken))
  }
}
