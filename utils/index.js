import path from "node:path";
import fs from "node:fs";
import fetch from "node-fetch";
import vm from "vm";
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * @description 获取脚本头部
 * @returns {string} 返回脚本头部
 * @throws {Error} 当 package.json 文件不存在或缺少必要字段时抛出异常
 * @returns 
 */
export function getScriptHeader() {
    // 读取 package.json 文件内容
    const packagePath = path.join(__dirname, '../package.json');
    const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    // 必须的字段
    const required = ['name', 'author', 'description', 'version', 'settings'];
    const needKeys = ['name', 'author', 'description', 'version', 'icon', 'homepage', 'settings'];
    // 构建脚本头部
    return needKeys.reduce((acc, key, index) => {
        if (required.includes(key) && !packageData[key]) {
            throw new Error(`package.json lack of ${key}`);
        }
        const contentType = typeof packageData[key];
        const value = contentType === 'string' ? packageData[key] : JSON.stringify(packageData[key]);
        acc += `// @${key} ${value}\n`;
        if (index === needKeys.length - 1) {
            acc += '// ==/FFandownScript==\n';
        }
        return acc;
    }, '// ==FFandownScript==\n');
}



/**
 * @description 获取脚本内容
 * @returns {string} 返回脚本内容
 * @throws {Error} 当文件不存在时抛出异常
 * @returns 
 */
export function getScriptContent() {
    // 读取script/index.js文件内容
    const filePath = path.join(__dirname, '../script', 'index.js');
    // 判断文件是否存在
    if (fs.existsSync(filePath)) {
        const scriptContent = fs.readFileSync(filePath, 'utf8');
        const scriptHeader = getScriptHeader();
        const content = scriptHeader + scriptContent;
        return content;
    } else {
        // 文件不存在的情况
        throw new Error(`Can't find script/index.js file`);
    }
}

/**
 * @description 获取脚本内容仅仅获取脚本文件去掉头部注解信息
 * @returns {string} 返回脚本内容
 * @throws {Error} 当文件不存在时抛出异常
 * @returns 
 */
export function getScriptContentFromFile() {
    const filePath = path.join(__dirname, '../script', 'index.js');
    // 读取文件内容
    const scriptContent = fs.readFileSync(filePath, 'utf8');
    if (fs.existsSync(filePath)) {
        return scriptContent;
    } else {    
        throw new Error(`Can't find ${filePath} file`);
    }
}

/**
 * @description 解析插件代码并创建解析器实例
 * @param {string} jsCode 包含解析器类定义的 JavaScript 代码
 * @returns {Object} 返回解析器实例
 * @throws {Error} 当代码格式错误或执行失败时抛出异常
 */
export const makeParser = (jsCode) => {
    if (typeof jsCode !== 'string' || !jsCode.trim()) {
        throw new Error('Invalid parser code')
    }
    const sandbox = {
        console,
        fetch,
        URL,
        URLSearchParams,
    }
    try {
        // 将沙箱对象包装到 VM 中
        const script = new vm.Script(`(() => ${jsCode})()`)
        // 创建一个新的上下文
        const context = vm.createContext(sandbox)
        // 在沙箱中运行脚本
        const Parser = script.runInContext(context)
        // console.log(jsCode,Parser)
        if (typeof Parser !== 'function') {
            throw new Error('Parser must be a constructor function')
        }
        const parser = new Parser()
        return parser
    } catch (error) {
        throw new Error(`Failed to create parser: ${error.message}`)
    }
}

/**
 * @description 从文本中提取注解
 * @param {*} text 
 * @returns 
 */
const extractScriptBlock = (text) => {
    let textRemoveComments = text
    const allAnnotations = text.match(/\/\/.+\n/g)
    if (allAnnotations && allAnnotations.length) {
        let code = 0
        const pluginInfo =  allAnnotations.reduce((pre, value) => {
            const splitSpaceAndLine = (str) => str.replace(/^\/\/\s*/gm, '').trim()
            if (splitSpaceAndLine(value) === '==FFandownScript==') {
                code = 1
                textRemoveComments = textRemoveComments.replace(value, '')
                return pre
            } else if (splitSpaceAndLine(value) === '==/FFandownScript==') {
                code = 0
                textRemoveComments = textRemoveComments.replace(value, '')
                return pre
            } else if (code === 1 && value)  {
                const info = splitSpaceAndLine(value)
                const match = info.match(/^@(\w+)\s+(.+)$/)
                if (!match) return pre
                let key = match[1]
                let val = match[2]
                key = key && key.trim()
                val = val && val.trim()
                if (key && val) pre[key] = val
                textRemoveComments = textRemoveComments.replace(value, '')
            } 
            return pre
        }, {})
        return {
            pluginInfo,
            textRemoveComments,
        }
    } else {
        return { pluginInfo: null, textRemoveComments }
    }
}


export const validate = (pluginContent) => {
    const required = ['name', 'author', 'description', 'version']
    // 缺少注解信息
    const lossKey = []
    const { pluginInfo,  textRemoveComments } = extractScriptBlock(pluginContent)
    // 2. 解析插件信息
    required.forEach(requiredKey => {
        if (pluginInfo[requiredKey] === undefined) lossKey.push(requiredKey)
    })
    if (lossKey.length > 0) {
        // 缺少注解信息
        return {
            result: false,
            message: `Lack of annotation information: ${lossKey.join(', ')}`,
        }
    } else {
        const parserPlugin = makeParser(textRemoveComments)
        if (!parserPlugin.match || !parserPlugin.parser) {
            // 缺少 match 或 parser 方法
            return {
                result: false,
                message: 'Plugin cannot be used, missing match or parser methods',
            }
        } else {
            return {
                result: true,
                message: 'Plugin verification passed',
            }
        }
    }
}