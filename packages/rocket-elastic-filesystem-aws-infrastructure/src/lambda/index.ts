import { exec } from 'child-process-promise'

export const handler = async function (event: any): Promise<any> {
  exec('cd /mnt/efs')
  exec('mkdir my-folder')
  exec('touch my-folder/lala.py')
  exec('ls').then(res => {
    console.log(res)
  })
  console.log("EVENT ->>>>>" + event)
  console.log(process.cwd())
  return "I finished, yay!!"
}