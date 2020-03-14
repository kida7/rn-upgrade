import path from 'path'
import fs from 'fs'
import { spawn, SpawnOptions } from 'child_process'
const _package = require('../package.json')

function argsToArray(args: string) {
    args = args.replace(/('|").+?[^\\]\1/g, match => {
        return match.replace(/ /g, '_#')
    })
    return args.split(/\s+/).map(t => t.replace(/_#/g, ' ').replace(/^('|")(.+?)\1$/, '$2'))
}
function exec(command: string, options?: SpawnOptions | null, takeReturn = false) {
    return new Promise<string>((resolve, reject) => {
        let args = argsToArray(command)
        let _command = args[0]
        let _args = args.slice(1)
        // console.log(args)
        // resolve()
        let _spawn
        if (takeReturn) {
            _spawn = spawn(_command, _args, { ...options })
            let result = ''
            _spawn.stdout && _spawn.stdout.on('data', data => result += data.toString())
            _spawn.on('close', () => {
                resolve(result)
            })
        }
        else {
            _spawn = spawn(_command, _args, { ...options, stdio: [0, 1, 2] })
            _spawn.on('close', () => {
                resolve()
            })
        }
    })
}
const Version = _package.version
export {
    exec,
    argsToArray,
    Version
}
