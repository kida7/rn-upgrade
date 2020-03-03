//@ts-nocheck
import { exec } from './utils';
import fs from 'fs';
import parser from 'yargs-parser'
let _package = require('../package.json')
const argv = parser(process.argv.slice(2));

(async function () {
    _package.version = argv.version || argv.v || _package.version;
    await exec('tsc')
    await exec('npm publish')
})()