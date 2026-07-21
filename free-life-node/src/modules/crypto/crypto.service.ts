import { Injectable, OnModuleInit } from '@nestjs/common';
import { RSAUtil, RSAKeyPair } from '@/utils/crypto/rsa.util';
import { ConfigService } from '@nestjs/config';
import { ResponseDto } from '@/common/dto/response.dto';

@Injectable()
export class CryptoService implements OnModuleInit {
  private keyPair: RSAKeyPair;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    // 初始化时生成密钥对，或者从配置中读取
    const savedPrivateKey = this.configService.get<string>('RSA_PRIVATE_KEY');
    const savedPublicKey = this.configService.get<string>('RSA_PUBLIC_KEY');

    if (savedPrivateKey && savedPublicKey) {
      this.keyPair = {
        privateKey: savedPrivateKey,
        publicKey: savedPublicKey
      };
    } else {
      // 如果没有保存的密钥，生成新的密钥对
      // this.keyPair = RSAUtil.generateKeyPair(2048);
      throw new Error('RSA_PRIVATE_KEY 或 RSA_PUBLIC_KEY 未配置');
    }
  }

  /**
   * 获取公钥
   * @returns PEM 格式的公钥
   */
  getPublicKey(): ResponseDto<string> {
    return ResponseDto.success(this.keyPair.publicKey);
  }

  /**
   * 解密数据
   * @param encryptedData base64 编码的加密数据
   * @returns 解密后的原始数据
   */
  decrypt(encryptedData: string): string {
    return RSAUtil.decrypt(encryptedData, this.keyPair.privateKey);
  }

  /**
   * 解密大数据
   * @param encryptedData 分块加密的数据（base64 编码，点号分隔）
   * @returns 解密后的原始数据
   */
  decryptLarge(encryptedData: string): string {
    return RSAUtil.decryptLarge(encryptedData, this.keyPair.privateKey);
  }
}