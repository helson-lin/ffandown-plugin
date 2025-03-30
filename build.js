import chalk from 'chalk'
import path from 'node:path';
import fs from 'node:fs';
import { ensureDirSync } from 'fs-extra/esm'
import { fileURLToPath } from "node:url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getScriptContent, validate } from './utils/index.js'

const build  = () => {
    try {
        const scriptContent = getScriptContent();
        const validateData = validate(scriptContent);
        if (!validateData.result) {
            console.log('🔴 '+ chalk.red(validateData.message))
            return;
        } else {
            console.log('✅ '+ chalk.green(validateData.message))
        }
        // 输出 scriptContent到 build/index.js
        const outputDir = path.join(__dirname, 'build');
        ensureDirSync(outputDir);
        const filePath = path.join(outputDir, 'index.js');
        fs.writeFileSync(filePath, scriptContent);
        console.log('✅ ' + chalk.green(`Build success, the file path is ${filePath}`))
    } catch (error) {
        console.log('🔴 ' + chalk.red(error))
    }
}

build();