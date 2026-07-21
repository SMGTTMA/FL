import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config();

/**
 * 执行模版
 * ts-node 是一个 TypeScript 执行器，可以直接运行 .ts 文件，无需先编译成 .js 文件
 * -r 是 Node.js 的参数，表示“require”，即在执行主文件前先加载一个模块
 * tsconfig-paths/register 是一个辅助库，用于让 ts-node 支持 tsconfig.json 里的 paths 和 baseUrl 路径别名
 * pnpm ts-node -r tsconfig-paths/register scripts/call-api.ts auth/register username=name password=pwd
 */

const port = process.env.PORT || 8000;
const API_URL = `http://127.0.0.1:${port}/api`;

// 优先从环境变量读取 token，否则从 .localToken 文件读取
const tokenPath = path.resolve(__dirname, '.localToken');
let ACCESS_TOKEN = '';
if (fs.existsSync(tokenPath)) {
  ACCESS_TOKEN = fs.readFileSync(tokenPath, 'utf-8').trim();
}

async function runCommand() {
  const [endpoint, ...params] = process.argv.slice(2);
  console.log('输入的参数:', process.argv.slice(2));

  if (!endpoint) {
    console.error('请指定 endpoint，例如：auth/register');
    process.exit(1);
  }

  // 支持参数格式：key=value，支持类型前缀 n: b: s:
  const body: Record<string, any> = {};
  params.forEach((param) => {
    let [key, value] = param.split('=');
    let type = 's'; // 默认字符串
    if (key.includes(':')) {
      [type, key] = key.split(':');
    }
    switch (type) {
      case 'n':
        body[key] = Number(value);
        break;
      case 'b':
        body[key] = value === 'true';
        break;
      case 's':
      default:
        body[key] = value;
    }
  });

  try {
    const response = await axios.post(`${API_URL}/${endpoint}`, body, {
      headers: {
        ...(ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {}),
      },
    });
    console.log('Response:', response.data);
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

runCommand();
