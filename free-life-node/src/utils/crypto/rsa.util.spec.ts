import { RSAUtil } from './rsa.util';

describe('RSAUtil', () => {
  let keyPair: { publicKey: string; privateKey: string };

  beforeAll(() => {
    // 生成测试用的密钥对
    keyPair = RSAUtil.generateKeyPair(2048);
  });

  describe('generateKeyPair', () => {
    it('应该生成有效的 RSA 密钥对', () => {
      const { publicKey, privateKey } = RSAUtil.generateKeyPair();

      expect(publicKey).toBeDefined();
      expect(privateKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
      expect(typeof privateKey).toBe('string');
      expect(publicKey).toContain('-----BEGIN PUBLIC KEY-----');
      expect(privateKey).toContain('-----BEGIN PRIVATE KEY-----');
    });

    it('应该能够生成不同长度的密钥对', () => {
      const keyPair4096 = RSAUtil.generateKeyPair(4096);
      expect(keyPair4096.publicKey.length).toBeGreaterThan(keyPair.publicKey.length);
    });
  });

  describe('encrypt 和 decrypt', () => {
    it('应该能够成功加密和解密数据', () => {
      const originalData = '这是测试数据';
      const encrypted = RSAUtil.encrypt(originalData, keyPair.publicKey);
      const decrypted = RSAUtil.decrypt(encrypted, keyPair.privateKey);

      expect(decrypted).toBe(originalData);
    });

    it('应该能够处理空字符串', () => {
      const originalData = '';
      const encrypted = RSAUtil.encrypt(originalData, keyPair.publicKey);
      const decrypted = RSAUtil.decrypt(encrypted, keyPair.privateKey);

      expect(decrypted).toBe(originalData);
    });

    it('应该能够处理特殊字符', () => {
      const originalData = '特殊字符!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      const encrypted = RSAUtil.encrypt(originalData, keyPair.publicKey);
      const decrypted = RSAUtil.decrypt(encrypted, keyPair.privateKey);

      expect(decrypted).toBe(originalData);
    });

    it('使用错误的私钥解密时应该抛出错误', () => {
      const originalData = '测试数据';
      const encrypted = RSAUtil.encrypt(originalData, keyPair.publicKey);
      const wrongKeyPair = RSAUtil.generateKeyPair();

      expect(() => RSAUtil.decrypt(encrypted, wrongKeyPair.privateKey)).toThrow();
    });

    it('解密无效的 base64 字符串时应该抛出错误', () => {
      const invalidEncrypted = 'invalid-base64-data';
      expect(() => RSAUtil.decrypt(invalidEncrypted, keyPair.privateKey)).toThrow();
    });
  });

  describe('encryptLarge 和 decryptLarge', () => {
    it('应该能够处理大量数据', () => {
      const largeData = 'x'.repeat(1000); // 1KB 的数据
      const encrypted = RSAUtil.encryptLarge(largeData, keyPair.publicKey);
      const decrypted = RSAUtil.decryptLarge(encrypted, keyPair.privateKey);

      expect(decrypted).toBe(largeData);
      expect(decrypted.length).toBe(1000);
    });

    it('应该正确处理分块加密', () => {
      const data = 'a'.repeat(500); // 500 字节的数据
      const encrypted = RSAUtil.encryptLarge(data, keyPair.publicKey, 100);

      // 检查是否被分成多个块（通过点号分隔）
      expect(encrypted.split('.').length).toBeGreaterThan(1);

      const decrypted = RSAUtil.decryptLarge(encrypted, keyPair.privateKey);
      expect(decrypted).toBe(data);
    });

    it('使用错误的私钥解密大数据时应该抛出错误', () => {
      const data = 'x'.repeat(1000);
      const encrypted = RSAUtil.encryptLarge(data, keyPair.publicKey);
      const wrongKeyPair = RSAUtil.generateKeyPair();

      expect(() => RSAUtil.decryptLarge(encrypted, wrongKeyPair.privateKey)).toThrow();
    });

    it('解密被篡改的分块数据时应该抛出错误', () => {
      const data = 'x'.repeat(1000);
      const encrypted = RSAUtil.encryptLarge(data, keyPair.publicKey);
      const tamperedEncrypted = encrypted.slice(0, -5) + 'XXXXX'; // 篡改最后5个字符

      expect(() => RSAUtil.decryptLarge(tamperedEncrypted, keyPair.privateKey)).toThrow();
    });
  });
});