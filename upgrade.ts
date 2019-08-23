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
let dicCantPatch: {
    [key: string]: string[]
} = {};
// let _allDiff:string[]
(async function () {
    if (!_newVer) {
        console.log('No way')
        return
    }
    //@ts-ignore
    let _androidPackage = androidManifest.match(/package="(.+?)"/)[1]
    console.log(_androidPackage)
    // return
    let diff = await exec(`curl https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/${_currentVer}..${_newVer}.diff`, null, true)
    if (!diff.startsWith('diff')) {
        console.log('Có biến với version bạn chọn')
        return
    }
    // console.log(diff)
    diff = diff.replace(/\W[ab]\/RnDiffApp\//g, match => match
        .replace(/(\W[ab]\/)RnDiffApp\//, '$1'))
        .replace(/ios\/RnDiffApp/g, 'ios/' + _name)
        .replace(/com\.rndiffapp/g, _androidPackage)
        .replace(/com\/rndiffapp/g, _androidPackage.replace(/\./g, '\/'))
        .replace(/RnDiffApp/g, _name)
    fs.writeFileSync('./diff', diff)
    // return
    //@ts-ignore
    let changeBlocks = diff
        .split(/diff --git a\/.+ b\/.+\n/).slice(1)
    let _allDiff = diff.match(/diff --git a\/.+ b\/.+\n/g) || []
    // console.log(changeFiles[0])
    let noPatchFile: string[] = []
    changeBlocks.forEach((block, index) => {
        // if (index == 1)
        patch(block, _allDiff[index])
    })
})()

// console.log(chalk.red('Các file sau bạn phải tự patch bằng tay:'))
// console.log(chalk.yellow(noPatchFile.join('\n')))
function patch2(_fileContent: string, block: string, deep: number, _file: string): string | null {
    // console.log(block, '\n\n')
    let origin = block.split('\n').filter(t => !t.match(/^\+/)).map(t => t.replace(/^-/, '')).join('\n')
    let _patch = block.split('\n').filter(t => !t.match(/^-/)).map(t => t.replace(/^\+/, '')).join('\n')

    //@ts-ignore
    let _reg = (origin.toRegex('i', true).replace(/\d+/g, '\\d+'))


    let match
    if (!(match = _fileContent.match(new RegExp(_reg, 'm')))) {
        let _block = block.split('\n')
        let result = null
        if (!_block[0].match(/^[+-]/))
            result = patch2(_fileContent, _block.slice(1).join('\n'), deep + 1, _file)

        if (!result && !deep) {
            let _block2 = block.split('\n').map(t => t.replace(/^[+-].*$/g, match => {
                let _match = match.match(/^([+-])(.*)$/)
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

function patch(changeContent: string, diff: string) {
    let match = diff.match('diff --git a\/(.+) b\/(.+)')
    //@ts-ignore
    let _file = match[2]
    if (changeContent.match(/GIT binary patch/)) {
        //@ts-ignore
        console.log(`${chalk.yellow('Binary files')}: ${chalk.green(_file)}`)
        console.log(`https://raw.githubusercontent.com/react-native-community/rn-diff-purge/version/${_newVer}/RnDiffApp/${_file}`)
        return
    } else if (changeContent.startsWith('new file mode')) {
        //@ts-ignore
        console.log(chalk.blue('Tạo mới file:'), chalk.green(_file))
        changeContent = changeContent.split('\n').map(t => t.replace(/^\+/g, '')).join('\n')
        // console.log(chalk.green(changeContent))
        // fs.writeFileSync(path.join(rootFolder, _file), changeContent)
        return
    } else if (changeContent.startsWith('deleted file mode')) {
        console.log(chalk.red('Xoá file:'), chalk.green(_file))
        return
    }
    let patches = changeContent.split(/@@.+?@@[ \n]/).slice(1)
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

