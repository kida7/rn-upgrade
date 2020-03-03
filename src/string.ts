interface String {
    changeAlias: () => string;
    format: (...args: any) => string;
    toRegex: (option?: string | undefined, toRegString?: boolean) => RegExp | string,
    asyncReplace: (searchValue: string | RegExp, replacer: string | ((matchString: string, index: number, matchesLength: number) => Promise<string>)) => Promise<string>,
}

String.prototype.format = function () {
    //@ts-ignore
    let a: string = this;
    for (let k in arguments) {
        a = a.replace(("{" + k + "}").toRegex('g'), arguments[k])
    }
    return a
}
String.prototype.toRegex = function (option: string | undefined = 'i', toRegString = false) {
    let regexStr = this.replace(/[\.\*\+\?\^\$\{\}\(\)\|\[\]\\\/]/g, '\\$&')
    regexStr = regexStr.replace(/\n/g, '\\n').replace(/ +/g, ' *')
    return toRegString ? regexStr : RegExp(regexStr, option)
}
String.prototype.asyncReplace = function () {
    let str = this, findItem = arguments[0], replacer = arguments[1]
    return new Promise(async (resolve, reject) => {
        let matches = str.match(new RegExp(findItem, 'g')) || []
        let result: { [key: string]: string } = {}
        for (let i in matches) {
            let tmp = replacer(matches[i], i, matches.length)
            if (tmp && tmp.constructor.name == 'Promise') {
                result[matches[i]] = await function () { return tmp }()
            } else
                result[matches[i]] = tmp
        }
        resolve(str.replace(findItem, match => result[match]))
    })
}

String.prototype.changeAlias = function () {
    //@ts-ignore
    var str: string = this;
    str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
    str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
    str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
    str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
    str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
    str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
    str = str.replace(/đ/g, "d");
    str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
    str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
    str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
    str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
    str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
    str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
    str = str.replace(/Đ/g, "D");
    return str;
};