#!/usr/bin/env node

/**
 * @author kida7
 */

import { exec } from './utils'
import parser from 'yargs-parser'
import path from 'path'
import fs from 'fs'
import chalk from 'chalk'
// import axios from 'axios'

require('./string')
///Users/vinhle/Desktop/projects/rn_v60/android/app/src/main/AndroidManifest.xml
const argv = parser(process.argv.slice(2))
let _folder = argv._[0] || __dirname
let rootFolder = path.relative(__dirname, _folder)
let _package = JSON.parse(fs.readFileSync(path.join(rootFolder, 'package.json'), 'utf-8'))
const androidManifestPath = path.join(rootFolder, 'android/app/src/main/AndroidManifest.xml')
let androidManifest = fs.readFileSync(androidManifestPath, { encoding: 'utf-8' })
let _name = _package.name
let _currentVer = _package.dependencies['react-native'].replace(/[^\d\.-\w]/g, '')
let _newVer = argv.v || argv.version;
let diff = argv.diff || `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/${_currentVer}..${_newVer}.diff`
let dicCantPatch: {
    [key: string]: string[]
} = {};
// let _allDiff:string[]
(async function () {
    if (!argv.diff && !_newVer) {
        console.log('You have to specify version (--version/-v) or diff file (--diff)')
        return
    }
    //@ts-ignore
    let _androidPackage = androidManifest.match(/package="(.+?)"/)[1]
    console.log(_androidPackage)
    // return
    let diffContent = diff.match(/http/) ? await exec(`curl ${diff}`, null, true) : fs.readFileSync(diff, 'utf-8')
    if (!diffContent.startsWith('diff')) {
        console.log('Có biến với version bạn chọn')
        return
    }
    diffContent = diffContent.replace(/\W[ab]\/RnDiffApp\//g, match => match
        .replace(/(\W[ab]\/)RnDiffApp\//, '$1'))
        .replace(/ios\/RnDiffApp/g, 'ios/' + _name)
        .replace(/com\.rndiffapp/g, _androidPackage)
        .replace(/com\/rndiffapp/g, _androidPackage.replace(/\./g, '\/'))
        .replace(/RnDiffApp/g, _name)
    fs.writeFileSync('./diff', diffContent)
    //@ts-ignore
    let changeBlocks = diffContent
        .split(/diff --git a\/.+ b\/.+\n/).slice(1)
    let _allDiff = diffContent.match(/diff --git a\/.+ b\/.+\n/g) || []
    let noPatchFile: string[] = []
    changeBlocks.forEach(async (block, index) => {
        await patch(block, _allDiff[index])
    })
})()

function patch2(_fileContent: string, block4: string, deep: number, _file: string): string | null {
    let _block3 = block4.split('\n')
    if (!deep)
        _block3 = _block3.filter(t => !t.match(/^\\/)).map(t => t.replace(/^ /g, ''))
    let origin = _block3.filter(t => !t.match(/^[\+]/)).map(t => t.replace(/^[-]/, '')).join('\n')
    let _patch = _block3.filter(t => !t.match(/^[-]/)).map(t => t.replace(/^[\+]/, '')).join('\n')

    //@ts-ignore
    let _reg = (origin.toRegex('i', true).replace(/\d+/g, '\\d+'))


    if (!(_fileContent.match(new RegExp(_reg, 'm')))) {
        let result = null
        if (!_block3[0].match(/^[+-]/))
            result = patch2(_fileContent, _block3.slice(1).join('\n'), deep + 1, _file)
        else if (!_block3[_block3.length - 1].match(/^[+-]/))
            result = patch2(_fileContent, _block3.slice(0, _block3.length - 1).join('\n'), deep + 1, _file)
        if (!result && !deep) {
            let _block2 = _block3.map(t => t.replace(/^[\+-].*$/g, match => {
                let _match = match.match(/^([\+-])(.*)$/)
                //@ts-ignore
                return (_match[1] == '+') ? chalk.green(_match[2]) : chalk.red(_match[2])
            })).join('\n')
            console.log(_reg)
            if (!dicCantPatch[_file]) dicCantPatch[_file] = []
            dicCantPatch[_file].push(_block2)
        }
        return result
    }
    return _fileContent.replace(new RegExp(_reg), _patch)
}

async function patch(changeContent: string, diff: string) {
    let match = diff.match('diff --git a\/(.+) b\/(.+)')
    //@ts-ignore
    let _file = match[2]
    if (changeContent.match(/GIT binary patch/)) {
        //@ts-ignore
        console.log(`${chalk.yellow('Binary files')}: ${chalk.green(_file)}`)
        if (!_newVer)
            await exec(`curl https://raw.githubusercontent.com/react-native-community/rn-diff-purge/version/${_newVer}/RnDiffApp/${_file} -o ${path.join(rootFolder, _file)}`)
        return
    } else if (changeContent.startsWith('new file mode')) {
        //@ts-ignore
        console.log(chalk.blue('Tạo mới file:'), chalk.green(_file))
        changeContent = changeContent.split('\n').map(t => t.replace(/^\+/g, '')).join('\n')
        fs.writeFileSync(path.join(rootFolder, _file), changeContent)
        return
    } else if (changeContent.startsWith('deleted file mode')) {
        console.log(chalk.red('Xoá file:'), chalk.green(_file))
        exec(`rm -rf ${path.join(rootFolder, _file)}`)
        return
    }
    let patches = changeContent.split(/@@.+?@@\n?/).slice(1)
    try {
        //@ts-ignore
        let _fileContent = fs.readFileSync(path.join(rootFolder, _file), 'utf-8')
        let patchCount = 0
        patches.forEach(_patch => {
            let _new = patch2(_fileContent, _patch, 0, _file)
            if (_new) {
                patchCount++
                _fileContent = _new
            }
        })
        fs.writeFileSync(path.join(rootFolder, _file), _fileContent)
        //@ts-ignore
        console.log(chalk.yellow(`Đã sửa ${chalk.blue('{0}/{1}')} chỗ của file: ${chalk.green('{2}')}`).format(patchCount, patches.length, _file))
        if (patchCount < patches.length) {
            console.log(chalk.redBright('Conflict:'))
            console.log(chalk.gray(dicCantPatch[_file].join(chalk.redBright('\nConflict:\n'))))
        }
    } catch (ex) {
        console.log(ex)
        switch (ex.code) {
            case 'ENOENT':
                break;
            default:
                console.log(chalk.grey(changeContent))
                break;
        }
    }

}

