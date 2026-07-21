import axios from 'axios';
import { RSAUtil } from '@/utils/crypto/rsa.util';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as promptSync from 'prompt-sync';

dotenv.config();

const prompt = promptSync();
const port = process.env.PORT || 8000;
const API_URL = `http://127.0.0.1:${port}/api`;
// 从环境变量或本地文件读取公钥
const publicKey = process.env.RSA_PUBLIC_KEY;

// 自动读取 token
const tokenPath = path.resolve(__dirname, '.localToken');
let ACCESS_TOKEN = '';
if (fs.existsSync(tokenPath)) {
  ACCESS_TOKEN = fs.readFileSync(tokenPath, 'utf-8').trim();
}

async function addExchangeConfig() {
  const paramsList = process.argv.slice(2);
  console.log('输入的参数:', paramsList);

  // 解析参数
  const argMap: Record<string, string> = {};
  paramsList.forEach((ele) => {
    const [key, value] = ele.split('=');
    argMap[key] = value;
  });

  // 交互式补全参数
  const configName = argMap.configName || prompt('配置名称(configName): ');
  const apiKey = argMap.apiKey || prompt('API Key(apiKey): ');
  const secretKey = prompt.hide('Secret Key(secretKey): ');
  const passphrase = prompt.hide('Passphrase(password): ');
  let isTestNet: boolean;
  if (typeof argMap.isTestNet !== 'undefined') {
    isTestNet = argMap.isTestNet === 'true' || argMap.isTestNet === '1';
  } else {
    const input = prompt('是否为测试网(isTestNet)? (y/N): ');
    isTestNet = input.trim().toLowerCase() === 'y';
  }

  // 参数校验
  if (!configName || !apiKey || !secretKey || !passphrase) {
    console.log('所有参数均为必填，请重新输入。');
    return;
  }

  // 构造请求体
  const body = {
    configName,
    apiKey: RSAUtil.encrypt(apiKey, publicKey),
    secretKey: RSAUtil.encrypt(secretKey, publicKey),
    passphrase: RSAUtil.encrypt(passphrase, publicKey),
    isTestNet,
  };

  try {
    const response = await axios.post(`${API_URL}/exchange/addConfig`, body, {
      headers: {
        ...(ACCESS_TOKEN ? { Authorization: `Bearer ${ACCESS_TOKEN}` } : {}),
      },
    });
    console.log('添加配置结果:', response.data);
  } catch (error: any) {
    console.error('API Error:', error.response?.data || error.message);
  }
}

addExchangeConfig();
