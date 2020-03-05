#!/usr/bin/env node

import './string'
import fse from 'fs-extra'
import path from 'path'
import chalk from 'chalk'
import parse from 'csv-parse'
import parser from 'yargs-parser'
import _ from 'lodash'

const argv = parser(process.argv.slice(2))
const translate = require('translate-google')

const toCSV = argv.toCsv
let scan = argv.scan;
let applyFiles: string[] = []
let add = argv.a || argv.add;

interface LangObject {
    [key: string]: {
        [key: string]: string
    }
}
let originLang = argv.originLang || 'vi'
let lang: LangObject = { [originLang]: {}, en: {} };
let _folder = argv._[0] || '.'
let rootFolder = path.relative('.', _folder)
console.log(rootFolder)
let _package = JSON.parse(fse.readFileSync(path.join(rootFolder, 'package.json'), 'utf-8'))
const csvFile = argv.csv || _package.name + '.csv';
const ext = Object.keys(_package.devDependencies).indexOf('@types/react-native') > 0 ? 'ts' : 'js'
let alias = argv.alias;
let langRules: [RegExp, (key: string) => string][] = [];
let defaultLangRules = `let keyInCode = key => \`strings.\${key}\`
let keyInNode = key => \`{strings.\${key}}\`
langRules = [
    [/(?<=(?:placeholder|title|content|desc)=)(['"])([^\\1\\n])+?\\1/g, keyInNode],
    [/(?<=(?:placeholder|title|content|desc)={)(['"])([^\\1\\n])+?\\1/g, keyInCode],
    [/(?<=<Text.+?[^=]>)[^{\\n]+?(?=<\\/Text)/g, keyInNode],
    [/(?<=<Text.+?[^=]>{)(['"])([^\\1\\n])+?\\1/g, keyInCode],
    [/(?<=msg = )(['"])([^\\1\\n])+?\\1/g, keyInCode],
    [/(?<=(?:alert\\(|alert\\([^,]+,\\s?))(['"])([^\\1\\n])+?\\1/g, keyInCode],
    [/(?<=html={)(['"])([^\\1\\n])+?\\1/g, keyInCode]
]`;
let langRulesPath = path.join(rootFolder, 'lang-rules.js');
let langFilePath = argv.langFile;
let toLang = argv.to;
(async function main() {
    let extReg = new RegExp(`.${ext}`.toRegex('', true))
    await getAllFiles('src', extReg)
    langFilePath = langFilePath || applyFiles.find(t => t.match(/strings\./))
    if (!fse.existsSync(langRulesPath)) {
        console.log('lang-rules.is not exist! Initialize default')
        fse.writeFileSync(langRulesPath, defaultLangRules)
    }
    else if (argv.test) {
        console.log(fse.readFileSync(langRulesPath, 'utf-8').replace(/\\/g, '\\\\').replace(/(`|\$)/g, "\\$1"))
    }
    if (argv.help || argv.h) {
        console.log(`${chalk.green('Usage')}:
    translate [project path] [--scan] [--test] [--add <string> [<string>]...] [--lang-file <language file path>] [-i|--import <csv file>] [--to-csv]`
        )
        return
    }
    let data, run
    try {
        data = fse.readFileSync(langFilePath, 'utf-8')
        //xóa các đoạn gây lỗi trước khi xài eval
        data = data.replace(/.+LocalizedStrings\(/, 'lang=(')
        data = data.replace(/import.+/g, '').replace(/if \(__DEV__\)[\w\W]+/, '')

        eval(data)
    } catch (ex) {
        console.log(chalk.red('Could not found {0}'.format(langFilePath)))
    }


    // console.log(rootFolder)
    if (add) {
        run = true
        let strings = typeof add == 'string' ? [add] : add
        for (let i in applyFiles) {
            await exportLangFromFile(applyFiles[i], strings)
        }
    }
    if (scan) {
        run = true
        let _rules = fse.readFileSync(langRulesPath, 'utf-8')
        eval(_rules)
        //@ts-ignore

        await getAllFiles('src', extReg)
        // console.log(applyFiles)
        for (let i in applyFiles) {
            await exportStrings(applyFiles[i])
        }
    }
    if (toLang) {
        run = true
        lang[toLang] = lang[toLang] || {}
        for (let key in lang[originLang]) {
            if (lang[toLang][key])
                continue
            let _translate = await translate(lang[originLang][key], { from: originLang, to: toLang })
            console.log(lang[originLang][key], chalk.green(_translate))
            lang[toLang][key] = _translate
        }
    }
    if (toCSV) {
        run = true
        let _csv = (_toCSV(lang))
        fse.writeFileSync(csvFile, _csv)
    }
    if (argv.import || argv.i) {
        run = true
        await csv2Lang()
    }

    if (!argv.test && run)
        writeLangFile(lang)
    if (!run) {
        argv.h = true
        main()
    }
})()
/**
 * search string từ file và export vào file ngôn ngữ
 * @param file đường dẫn tới file cần search string
 * @param strings string cần search
 */
async function exportLangFromFile(file: string, strings: string[]) {
    let content: string = fse.readFileSync(file, 'utf-8');
    if (path.resolve(file) == path.resolve(langFilePath))
        return
    let include = false
    for (let i in strings) {
        content = await content.asyncReplace(new RegExp(`(['"])${strings[i].toRegex(undefined, true)}\\1`, 'g'), async match => {
            include = true
            let key = await addLang(match)
            return `strings.${key}`
        })
    }
    if (include) {
        applyLangExport(file, content)
    }
}

/**
 * lấy danh sách tất cả các file từ folder 
 * @param folder 
 * @param pattern 
 * @param dept 
 */
async function getAllFiles(folder: string, pattern: RegExp, dept = 0) {
    folder = path.join(rootFolder, folder)
    if (!dept)
        applyFiles = []
    try {
        let files = fse.readdirSync(folder)
        for (let i in files) {
            await getAllFiles(path.join(folder, files[i]), pattern, dept + 1)
        }
    } catch (ex) {
        if (!pattern || pattern.test(folder)) {
            applyFiles.push(folder)
        }
    }
}
function getKey(str: string) {
    let key = _.startCase(_.lowerCase(str.trim()))
        .replace(/\W+/g, '')
    if (/^\d/.test(key))
        key = `Num${key}`
    return key.substr(0, 50)
}
async function addLang(sourceStr: string, originStr?: string) {
    sourceStr = sourceStr.replace(/^['"](.+)['"]$/, '$1')
    let enStr = (await translate(sourceStr, { to: 'en' })).trim()
    let key = getKey(enStr)
    if (!lang.en[key]) lang.en[key] = enStr
    if (!lang[originLang][key]) lang[originLang][key] = sourceStr
    console.log(key, chalk.red(sourceStr))
    return key
}
function logMatch(str: string, str2: string) {
    console.log(str.replace(str2, chalk.red(str2)))
}
async function find(content: string, pattern: RegExp, apply: (str: string, match: RegExpMatchArray) => Promise<string>) {
    return await content.asyncReplace(new RegExp(pattern, 'g'), async (str) => {
        let match = str.match(pattern)
        return match ? await apply(str, match) : str
    })
}
/**
 * Export string từ file
 * @param file 
 */
async function exportStrings(file: string) {
    let content = fse.readFileSync(file, 'utf-8');
    if (path.resolve(file) == path.resolve(langFilePath))
        return
    let include = false
    // console.log(file)
    // tìm các chuỗi set cho các thuộc tính ...
    for (let i in langRules) {
        content = await content.asyncReplace(langRules[i][0], async str => {
            include = true
            let key = await addLang(str)
            return langRules[i][1](key)
        })
    }
    if (include) {
        await applyLangExport(file, content)
    }
}

/**
 * lưu content mới sau khi export language vào file (tự động import file strings)
 * @param file 
 * @param content 
 */
async function applyLangExport(file: string, content: string) {
    console.log(chalk.green(file))
    if (argv.test)
        return
    content = content.replace(/import strings from '.+/g, '')
    content = await content.asyncReplace(/import.+from.+/g, async (match, index, length) => {
        if (index == length - 1) {
            return `${match}\nimport strings from '{0}';`.format(alias || path.relative(file.replace(/\/[^\/]+$/, ''), langFilePath).replace(/\.\w+$/, ''))
        }
        return match
    })
    fse.writeFileSync(file, content)
}


function writeLangFile(_lang: LangObject) {
    let _langStr = JSON.stringify(_lang, null, 4)
    _langStr = _langStr.replace(/"([^"-]+)":/g, '$1:')
    fse.writeFile(langFilePath, `import LocalizedStrings from "react-native-localization";
import _ from 'lodash'
const strings = new LocalizedStrings(${ _langStr})
if (__DEV__) {
    //@ts-ignore
    let lang = strings.getContent();
    Object.keys(lang.${originLang}).forEach(key => {
        if (!lang.en[key])
            lang.en[key] = lang.${originLang}[key]
    })
    strings.setContent(lang)
}
export default strings`, function () {
        console.log('Completed!')
    })
}
function csv2Lang() {
    //$FlowFixMe
    let data = fse.readFileSync(csvFile, 'utf-8')
    return new Promise((resolve, reject) => {
        parse(data, {}, function (error, output: Array<Array<string>>) {
            let _lang: LangObject = {}, _colName: string[] = []
            // console.log(JSON.stringify(output))
            output.forEach((row, rowIndex) => {
                if (rowIndex == 0) {
                    for (let i = 1; i < row.length; i++) {
                        _colName[i] = row[i]
                        _lang[row[i]] = {}
                    }
                }
                else {
                    for (let i = 1; i < row.length; i++)
                        _lang[_colName[i]][row[0]] = row[i]
                }
            })
            for (let locale in lang) {
                lang[locale] = {
                    ...lang[locale],
                    ..._lang[locale]
                }
            }
            resolve(lang)
        })
    })
}



function _toCSV(langs: LangObject) {
    let result: LangObject = {}
    for (let langCode in langs) {
        let lang = langs[langCode]
        for (let key in lang) {
            if (!result[key]) result[key] = {}
            result[key][langCode] = lang[key]
        }
    }
    let langCodes = Object.keys(langs)
    let output = `key, ${langCodes.join(',')} \n`
    for (let key in result) {
        output += `${key}, ${langCodes.map(t => `"${(result[key][t] || '').replace(/"/g, '""')}"`).join(',')} \n`
    }
    return output
}