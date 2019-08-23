interface String {
    format: (...args: any) => String;
    toRegex: (option?: string, toRegString?: boolean) => RegExp | string
}

String.prototype.format = function () {
    let a = this;
    for (let k in arguments) {
        a = a.replace(("{" + k + "}").toRegex('g'), arguments[k])
    }
    return a
}
String.prototype.toRegex = function (option = 'i', toRegString = false) {
    let regexStr = this.replace(/[\.\*\+\?\^\$\{\}\(\)\|\[\]\\\/]/g, '\\$&')
    regexStr = regexStr.replace(/\n/g, '\\n').replace(/ +/g, ' *')
    return toRegString ? regexStr : RegExp(regexStr, option)
}
