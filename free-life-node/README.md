## 安装和运行

1. 安装依赖
```bash
pnpm install
```

2. 运行开发服务器（热加载）
```bash
pnpm start:dev
```

3. 访问 API 文档
```
http://localhost:3000/api
```

4. 生成 RSA 公钥和私钥（如需加密/解密功能）
```bash
# 生成 2048 位私钥（PEM 格式）
openssl genpkey -algorithm RSA -out private.pem -pkeyopt rsa_keygen_bits:2048
# 从私钥导出公钥（PEM 格式）
openssl rsa -pubout -in private.pem -out public.pem
```

5. 配置环境变量
将生成的密钥内容分别填入 .env 文件：
```env
RSA_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----...-----END PRIVATE KEY-----"
RSA_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----"
```
