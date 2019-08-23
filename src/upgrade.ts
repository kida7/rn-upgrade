
(async function main() {
    if (argv.help || argv.h) {
        console.log(
            `Upgrade react native project to a specific version

Usage:
    rn-upgrade [project folder] --version <version>

${chalk.red('You should run in the project folder or provide the path to the project folder')}
`
        )
    if (!argv.diff && !_newVer) {
        argv.help = true
        main()
    try {
        let _name = _package.name
        let _currentVer = _package.dependencies['react-native'].replace(/[^\d\.-\w]/g, '')
        let diff = argv.diff || `https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/${_currentVer}..${_newVer}.diff`

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
        writeFileSync('./diff', diffContent)
        //@ts-ignore
        let changeBlocks = diffContent
            .split(/diff --git a\/.+ b\/.+\n/).slice(1)
        let _allDiff = diffContent.match(/diff --git a\/.+ b\/.+\n/g) || []
        let noPatchFile: string[] = []
        for (let i = 0; i < changeBlocks.length; i++) {
            await patch(changeBlocks[i], _allDiff[i])
        }
    } catch (ex) {
        argv.help = true
        main()

        if (_newVer && !_isTest)