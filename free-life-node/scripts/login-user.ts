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
const tokenPath = path.resolve(__dirname, '.localToken');

async function login() {
  const paramsList = process.argv.slice(2);
  console.log('输入的参数:', paramsList);

  try {
    let username = '';
    let password = '';
    paramsList.forEach((ele) => {
      const [key, value] = ele.split('=');
      if (key === 'username') {
        username = value;
      }
    });

    if (!username) {
      username = prompt('请输入账号: ');
    }
    // 交互式隐藏输入密码
    password = prompt.hide('请输入密码: ');

    if (!username || !password) {
      console.log('请输入账号密码');
      return;
    }

    // 用公钥加密密码
    const encryptedPassword = RSAUtil.encrypt(password, publicKey);
    const response = await axios.post(`${API_URL}/auth/login`, {
      username,
      password: encryptedPassword,
    });
    const token = response.data?.data?.accessToken;
    if (token) {
      fs.writeFileSync(tokenPath, token, 'utf-8');
      console.log('登录成功，token 已保存到 .localToken 文件');
    }
    console.log('登录结果:', response.data);
  } catch (error: unknown) {
    console.error('API Error:', error);
  }
}

login();
