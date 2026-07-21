import { generateKeyPairSync, publicEncrypt, privateDecrypt, constants } from 'crypto';

export interface RSAKeyPair {
  publicKey: string;
  privateKey: string;
}

export class RSAUtil {
  private static readonly DEFAULT_BLOCK_SIZE = 190; // 对于 2048 位的密钥，考虑 OAEP padding

  /**
   * 生成 RSA 密钥对
   * @param modulusLength RSA 密钥长度（位数），推荐 2048 或 4096
   * @returns 包含公钥和私钥的密钥对
   */
  public static generateKeyPair(modulusLength: number = 2048): RSAKeyPair {
    try {
      const { publicKey, privateKey } = generateKeyPairSync('rsa', {
        modulusLength,
        publicKeyEncoding: {
          type: 'spki',
          format: 'pem'
        },
        privateKeyEncoding: {
          type: 'pkcs8',
          format: 'pem'
        }
      });

      return {
        publicKey,
        privateKey
      };
    } catch (error) {
      throw new Error('生成密钥对失败: ' + error.message);
    }
  }

  /**
   * 使用公钥加密数据
   * @param data 要加密的数据
   * @param publicKey PEM 格式的公钥
   * @returns base64 编码的加密数据
   */
  public static encrypt(data: string, publicKey: string): string {
    try {
      const buffer = Buffer.from(data, 'utf8');
      const encrypted = publicEncrypt(
        {
          key: publicKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        buffer
      );

      return encrypted.toString('base64');
    } catch (error) {
      throw new Error('加密失败: ' + error.message);
    }
  }

  /**
   * 使用私钥解密数据
   * @param encryptedData base64 编码的加密数据
   * @param privateKey PEM 格式的私钥
   * @returns 解密后的原始数据
   */
  public static decrypt(encryptedData: string, privateKey: string): string {
    try {
      const buffer = Buffer.from(encryptedData, 'base64');
      const decrypted = privateDecrypt(
        {
          key: privateKey,
          padding: constants.RSA_PKCS1_OAEP_PADDING,
          oaepHash: 'sha256'
        },
        buffer
      );

      return decrypted.toString('utf8');
    } catch (error) {
      throw new Error('解密失败: ' + error.message);
    }
  }

  /**
   * 分块加密大数据（RSA 单次加密数据大小有限制）
   * @param data 要加密的数据
   * @param publicKey PEM 格式的公钥
   * @param blockSize 分块大小（字节），默认为 190（适用于 2048 位密钥）
   * @returns base64 编码的加密数据，每个块之间用点号分隔
   */
  public static encryptLarge(data: string, publicKey: string, blockSize: number = this.DEFAULT_BLOCK_SIZE): string {
    try {
      const buffer = Buffer.from(data, 'utf8');
      const blocks: Buffer[] = [];

      // 分块加密
      for (let i = 0; i < buffer.length; i += blockSize) {
        const chunk = buffer.slice(i, i + blockSize);
        const encryptedChunk = publicEncrypt(
          {
            key: publicKey,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          chunk
        );
        blocks.push(encryptedChunk);
      }

      // 将所有加密块转换为 base64 并用点号连接
      return blocks.map(block => block.toString('base64')).join('.');
    } catch (error) {
      throw new Error('大数据加密失败: ' + error.message);
    }
  }

  /**
   * 解密分块加密的大数据
   * @param encryptedData 分块加密的数据（base64 编码，点号分隔）
   * @param privateKey PEM 格式的私钥
   * @returns 解密后的原始数据
   */
  public static decryptLarge(encryptedData: string, privateKey: string): string {
    try {
      // 分割加密块
      const blocks = encryptedData.split('.');
      const decryptedBlocks: Buffer[] = [];

      // 解密每个块
      for (const block of blocks) {
        const buffer = Buffer.from(block, 'base64');
        const decryptedChunk = privateDecrypt(
          {
            key: privateKey,
            padding: constants.RSA_PKCS1_OAEP_PADDING,
            oaepHash: 'sha256'
          },
          buffer
        );
        decryptedBlocks.push(decryptedChunk);
      }

      // 合并解密后的数据
      return Buffer.concat(decryptedBlocks).toString('utf8');
    } catch (error) {
      throw new Error('大数据解密失败: ' + error.message);
    }
  }
}