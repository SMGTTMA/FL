import axios from 'axios';
import * as dotenv from 'dotenv';
import * as promptSync from 'prompt-sync';
dotenv.config();

const prompt = promptSync();
const port = process.env.PORT || 8000;
const API_URL = `http://127.0.0.1:${port}/api`;

async function adminRegister() {
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
    const response = await axios.post(`${API_URL}/auth/adminRegister`, {
      username,
      password,
    });

    console.log('注册结果:', response.data);
  } catch (error: unknown) {
    console.error('API Error:', error);
  }
}

adminRegister();
