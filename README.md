# Welcome to react-native-upgrade 👋
![Version](https://img.shields.io/npm/v/rn-upgrade.svg)

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
rn-upgrade [project path, default: current folder] --dif <diff path>
```

### Scan string and export to language file for react-native-localization
```sh
translate [folder/default current folder] [--scan] [--add string string string...] [--to-csv] [--import <csv file>]
```
#### Options:
- scan: scan folder and export string to language file
- add: scan specific string in project and export to language file
- to-csv: export language file to csv format
- import: import csv and save as language file

## Contribute

Want to contribute? Please email me or send me a pull request

## Author

👤 **kida7** (kida7kahp@gmail.com)

* Github: [@kida7](https://github.com/kida7)

## Show your support

Give a ⭐️ if this project helped you!


***
_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_