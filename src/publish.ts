//@ts-nocheck
import { exec } from './utils';
import fs from 'fs';
import parser from 'yargs-parser'
let _package = require('../package.json')
const argv = parser(process.argv.slice(2));

(async function () {
    _package.version = argv.version || argv.v || _package.version.replace(/(\d+)$/, (match: string) => `${parseInt(match) + 1}`);
    fs.writeFileSync('../package.json', JSON.stringify(_package, null, 2))
    await exec('git add -A')
    await exec(`git commit -m 'publish version ${_package.version}'`)
    await exec('tsc')
    await exec('npm publish')
})()