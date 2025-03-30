import express from 'express';
import chalk from 'chalk';
import { getScriptContent, validate } from './utils/index.js';
const app = express();
const port = process.env.PORT || 3312;

app.get('/', (req, res) => {
    try {

        const content = getScriptContent();
        const validateData = validate(content);
        if (!validateData.result) {
            res.send(validateData.message)
            return;
        }
        res.setHeader('Content-Type', 'application/javascript');
        // 返回文件内容
        res.send(content);
    } catch (error) {
        res.status(500).send(`Server Error: ${error.message}`);
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(chalk.green(`- Server is running on port ${port}`));
});
