#!/usr/bin/env node
import { exec } from './utils'
import parser from 'yargs-parser'
require('./string')


const argv = parser(process.argv.slice(2))
const device = String(argv.device || argv.d || 'IPhone 6s');
const isHelp = argv.help;
let deviceId, status, runBoot;

(async function startSimulator() {
    if (isHelp) {
        console.log(`
Mở máy ảo Iphone

Usage: node sim [-d DeviceName]

Mặc định: Iphone 6s
        `)
        return
    }
    let list = await exec('xcrun simctl list', null, true)
    let match = (list.match(new RegExp(`${device.toRegex('', true)} \\(((?:[\\w\\d]+-){4}[\\w\\d]+)\\)\\s*\\((.+?)\\)`, 'i')))
    if (!match) {
        return
    }
    deviceId = match[1]
    status = match[2]
    console.log({ deviceId, status })

    if (!runBoot) {
        runBoot = true
        await exec(`xcrun simctl boot ${deviceId}`)
    }
    if (status == 'Shutdown') {
        setTimeout(startSimulator, 50)
        return
    }
    await exec(`open -a Simulator --args -CurrentDeviceUDID ${deviceId}`)
})()