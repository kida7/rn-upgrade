# Welcome to react-native-upgrade 👋
<a href="https://www.npmjs.com/package/rn-upgrade"><img src="https://img.shields.io/npm/v/rn-upgrade.svg" /></a>

> Upgrade react native version using rn-diff-purge repo

## Installation

```sh
yarn globall add rn-upgrade
```

## Usage

### Upgrade current project to a specific RN version
```sh
rn-upgrade [project path, default: current folder] --version <version>
```

### Apply a diff file from rn-purge 
```sh
rn-upgade --help
usage: upgrade [-h] [--source SOURCE] [--version VERSION] [--diff DIFF]
               [--test]
               

React Native upgrade tool using rn-diff-purge

Optional arguments:
  -h, --help            Show this help message and exit.
  --source SOURCE       Project folder path, default current folder
  --version VERSION, -v VERSION
                        Specific version to upgrade/downgrade
  --diff DIFF           Specific diff file (with rn-diff-purge repo) to patch 
                        (--version/-v option will be ignore
  --test                If true, there is no file change
```

##### Example:
```sh
rn-upgade --version 0.59.9
or
rn-upgade --diff https://raw.githubusercontent.com/react-native-community/rn-diff-purge/diffs/diffs/0.61.5..0.59.9.diff

```

### Scan string and export to language file for react-native-localization
```
translate --help
usage: translate [-h] [-v] [-to-csv] [--scan] [-a STRING1 STRING2 ...]
                 [--csv CSV_FILE] [-i] [--to LOCALE] [--alias ALIAS]
                 [--lang-file LANGFILE] [--test]
                 

React Native locale tool

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -to-csv               Export language file to csv
  --scan                Scan string in project to export to locale file
  -a STRING1 STRING2 ..., --add STRING1 STRING2 ...
                        Search for specific strings and export to locale file
  --csv CSV_FILE        Import strings from csv file and export to locale 
                        file, default is <package name>.csv
  -i , --import         import from csv, specific by --csv option
  --to LOCALE           translate origin locale strings to specific locale, 
                        ex: zh-CN
  --alias ALIAS         alias import instead of path import
  --lang-file LANGFILE  language file, if doesn't specific, we will search 
                        automatically
  --test                if true, script will show all results without doing 
                        any change
```
##### Example:
```sh
translate --scan --alias '$res/strings' 
```

## Contribute

Want to contribute? Please email me or send me a pull request

## Author

👤 **kida7** (kida7kahp@gmail.com)

* Github: [@kida7](https://github.com/kida7)

## Show your support

Give a ⭐️ if this project helped you!


***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_