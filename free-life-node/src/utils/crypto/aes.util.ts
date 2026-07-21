import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

export class AESUtil {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // for AES-256
  private static readonly IV_LENGTH = 12; // for GCM
  private static readonly AUTH_TAG_LENGTH = 16; // GCM auth tag length
  private static readonly SALT_LENGTH = 16;

  /**
   * 使用 AES-256-GCM 加密数据
   * @param data 要加密的数据
   * @param secretKey 密钥
   * @returns 加密后的数据 (base64编码)
   */
  public static async encrypt(data: string, secretKey: string): Promise<string> {
    try {
      if (!secretKey) {
        throw new Error('密钥不能为空');
      }

      // 生成随机盐值和IV
      const salt = randomBytes(this.SALT_LENGTH);
      const iv = randomBytes(this.IV_LENGTH);

      // 使用 scrypt 从密钥和盐值生成派生密钥
      const key = await promisify(scrypt)(secretKey, salt, this.KEY_LENGTH) as Buffer;

      // 创建加密器
      const cipher = createCipheriv(this.ALGORITHM, key, iv);

      // 加密数据
      const encryptedData = Buffer.concat([
        cipher.update(data, 'utf8'),
        cipher.final()
      ]);

      // 获取认证标签
      const authTag = cipher.getAuthTag();

      // 组合所有需要的数据：salt + iv + authTag + encryptedData
      const result = Buffer.concat([salt, iv, authTag, encryptedData]);

      // 返回 base64 编码的结果
      return result.toString('base64');
    } catch (error) {
      throw new Error('加密失败: ' + error.message);
    }
  }

  /**
   * 解密 AES-256-GCM 加密的数据
   * @param encryptedData 加密的数据 (base64编码)
   * @param secretKey 密钥
   * @returns 解密后的数据
   */
  public static async decrypt(encryptedData: string, secretKey: string): Promise<string> {
    try {
      // 将 base64 编码的数据转换为 Buffer
      const buffer = Buffer.from(encryptedData, 'base64');

      // 提取各个组件
      const salt = buffer.subarray(0, this.SALT_LENGTH);
      const iv = buffer.subarray(this.SALT_LENGTH, this.SALT_LENGTH + this.IV_LENGTH);
      const authTag = buffer.subarray(
        this.SALT_LENGTH + this.IV_LENGTH,
        this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH
      );
      const encrypted = buffer.subarray(this.SALT_LENGTH + this.IV_LENGTH + this.AUTH_TAG_LENGTH);

      // 使用 scrypt 从密钥和盐值生成派生密钥
      const key = await promisify(scrypt)(secretKey, salt, this.KEY_LENGTH) as Buffer;

      // 创建解密器
      const decipher = createDecipheriv(this.ALGORITHM, key, iv);
      decipher.setAuthTag(authTag);

      // 解密数据
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final()
      ]);

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('解密失败: ' + error.message);
    }
  }
}