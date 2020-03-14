#!/usr/bin/env node

/**
 * @author kida7
 */

import { exec, Version } from './utils'
import path from 'path'
import fs from 'fs'
import fse from 'fs-extra'
import chalk from 'chalk'
import { ArgumentParser } from 'argparse'
import './string'
const parser = new ArgumentParser({
    argumentDefault: {

    },
    // version: Version,

    addHelp: true,
    description: 'React Native upgrade tool using rn-diff-purge'
})
parser.addArgument(['--source'], { help: 'Project folder path, default current folder', dest: 'source', type: String })
parser.addArgument(['--version', '-v'], { help: 'Specific version to upgrade/downgrade', dest: 'version', type: String })
parser.addArgument(['--diff'], { help: 'Specific diff file (with rn-diff-purge repo) to patch (--version/-v option will be ignore', dest: 'diff', type: String, })
parser.addArgument(['--test'], { help: 'If true, there is no file change', dest: 'test', type: String, metavar: '' })

const argv = parser.parseArgs()
console.log(argv)
let _isTest = argv.test
let writeFileSync = _isTest ? function () { } : fse.outputFileSync
let _folder = argv.source || '.'
let rootFolder = path.relative('.', _folder)

let _newVer = argv.v || argv.version;
let dicCantPatch: {
    [key: string]: string[]
} = {};
// let _allDiff:string[]
(async function main() {

    if (!argv.diff && !_newVer) {
        argv.help = true
        main()
        return
    }
    // try {

    let _package = JSON.parse(fs.readFileSync(path.join(rootFolder, 'package.json'), 'utf-8'))
    let _name = _package.name
    let _currentVer = _package.dependencies['react-native'].replace(/[^\d\.-\w]/g, '')
    let diff = argv.diff || `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/${_currentVer}..${_newVer}.diff`

    const androidManifestPath = path.join(rootFolder, 'android/app/src/main/AndroidManifest.xml')
    let androidManifest = fs.readFileSync(androidManifestPath, { encoding: 'utf-8' })
    //@ts-ignore
    let _androidPackage = androidManifest.match(/package="(.+?)"/)[1]
    console.log(_androidPackage)
    // return
    let diffContent = diff.match(/http/) ? await exec(`curl ${diff}`, null, true) : fs.readFileSync(diff, 'utf-8')
    if (!diffContent.startsWith('diff')) {
        console.log('Có biến với version bạn chọn')
        return
    }
    diffContent = '\n' + diffContent.replace(/\W[ab]\/RnDiffApp\//g, match => match
        .replace(/(\W[ab]\/)RnDiffApp\//, '$1'))
        .replace(/ios\/RnDiffApp/g, 'ios/' + _name)
        .replace(/com\.rndiffapp/g, _androidPackage)
        .replace(/com\/rndiffapp/g, _androidPackage.replace(/\./g, '\/'))
        .replace(/RnDiffApp/g, _name)
    if (_isTest) {
        console.log(__dirname)
        fse.outputFileSync(path.join(__dirname, 'diff.diff'), diffContent)
    }
    //@ts-ignore
    let changeBlocks = diffContent
        .split(/\ndiff --git a\/.+ b\/.+/).slice(1)
    let _allDiff = diffContent.match(/\ndiff --git a\/.+ b\/.+\n/g) || []
    let noPatchFile: string[] = []
    // console.log(changeBlocks.length);
    // return
    for (let i = 0; i < changeBlocks.length; i++) {
        await patch(changeBlocks[i], _allDiff[i])
    }
    // } catch (ex) {
    //     console.log(chalk.red(ex.message), '\n')
    //     argv.help = true
    //     main()
    // }

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
    let match = diff.match(/diff --git a\/(.+) b\/(.+)/)
    //@ts-ignore
    let _aFile = match[1]
    //@ts-ignore
    let _bFile = match[2]
    // console.log({ a: _aFile, b: _bFile })
    if (changeContent.match(/GIT binary patch/)) {
        let link = `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/version/${_newVer}/RnDiffApp/${_bFile}`
        //@ts-ignore
        console.log(`${chalk.yellow('Download')} ${chalk.blue(link)} to ${chalk.green(_bFile)}`)
        if (_newVer && !_isTest)
            await exec(`curl ${link} -o ${path.join(rootFolder, _bFile)}`)
        return
    } else if (changeContent.startsWith('deleted file mode')) {
        console.log(chalk.red('Xoá file:'), chalk.green(_aFile))
        if (!_isTest)
            exec(`rm -rf ${path.join(rootFolder, _aFile)}`)
        return
    }
    let patches = changeContent.split(/\n@@.+?@@\n?/).slice(1)
    try {
        //@ts-ignore
        if (changeContent.startsWith('new file mode')) {
            //@ts-ignore
            console.log(chalk.blue('Tạo mới file:'), chalk.green(_bFile))
            let _content = patches[0].split('\n').map(t => t.replace(/^\+/g, '')).join('\n')
            writeFileSync(path.join(rootFolder, _bFile), _content)
            return
        }
        let _fileContent = fs.readFileSync(path.join(rootFolder, _aFile), 'utf-8')
        let patchCount = 0
        patches.forEach(_patch => {
            let _new = patch2(_fileContent, _patch, 0, _aFile)
            if (_new) {
                patchCount++
                _fileContent = _new
            }
        })
        writeFileSync(path.join(rootFolder, _bFile), _fileContent)
        //@ts-ignore
        console.log(chalk.yellow(`Apply ${chalk.blue('{0}/{1}')} patches on file: ${chalk.green('{2}')}`).format(patchCount, patches.length, _aFile))
        if (patchCount < patches.length) {
            console.log(chalk.redBright('Conflict:'))
            console.log(chalk.gray(dicCantPatch[_aFile].join(chalk.redBright('\nConflict:\n'))))
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

