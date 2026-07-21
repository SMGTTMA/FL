import { AESUtil } from './aes.util';

describe('AESUtil', () => {
  const testSecretKey = 'test-secret-key-12345';

  describe('encrypt', () => {
    it('应该成功加密字符串数据', async () => {
      const testData = '这是测试数据';
      const encrypted = await AESUtil.encrypt(testData, testSecretKey);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
      // 确保加密后的数据是 base64 格式
      expect(() => Buffer.from(encrypted, 'base64')).not.toThrow();
    });

    it('应该对空字符串进行加密', async () => {
      const testData = '';
      const encrypted = await AESUtil.encrypt(testData, testSecretKey);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
      expect(encrypted.length).toBeGreaterThan(0);
    });

    it('应该对包含特殊字符的数据进行加密', async () => {
      const testData = '特殊字符!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      const encrypted = await AESUtil.encrypt(testData, testSecretKey);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe('string');
    });

    it('使用相同的数据和密钥多次加密应该产生不同的结果', async () => {
      const testData = '测试数据';
      const encrypted1 = await AESUtil.encrypt(testData, testSecretKey);
      const encrypted2 = await AESUtil.encrypt(testData, testSecretKey);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('当密钥为空时应该抛出错误', async () => {
      const testData = '测试数据';
      await expect(AESUtil.encrypt(testData, '')).rejects.toThrow();
    });
  });

  describe('decrypt', () => {
    it('应该能够成功解密加密后的数据', async () => {
      const originalData = '这是原始测试数据';
      const encrypted = await AESUtil.encrypt(originalData, testSecretKey);
      const decrypted = await AESUtil.decrypt(encrypted, testSecretKey);

      expect(decrypted).toBe(originalData);
    });

    it('应该能够处理空字符串的加密和解密', async () => {
      const originalData = '';
      const encrypted = await AESUtil.encrypt(originalData, testSecretKey);
      const decrypted = await AESUtil.decrypt(encrypted, testSecretKey);

      expect(decrypted).toBe(originalData);
    });

    it('应该能够处理包含特殊字符的数据', async () => {
      const originalData = '特殊字符!@#$%^&*()_+-=[]{}|;:,.<>?`~';
      const encrypted = await AESUtil.encrypt(originalData, testSecretKey);
      const decrypted = await AESUtil.decrypt(encrypted, testSecretKey);

      expect(decrypted).toBe(originalData);
    });

    it('使用错误的密钥解密时应该抛出错误', async () => {
      const originalData = '测试数据';
      const encrypted = await AESUtil.encrypt(originalData, testSecretKey);
      const wrongKey = 'wrong-key-12345';

      await expect(AESUtil.decrypt(encrypted, wrongKey)).rejects.toThrow();
    });

    it('解密无效的 base64 字符串时应该抛出错误', async () => {
      const invalidEncrypted = 'invalid-base64-data';
      await expect(AESUtil.decrypt(invalidEncrypted, testSecretKey)).rejects.toThrow();
    });

    it('解密被篡改的数据时应该抛出错误', async () => {
      const originalData = '测试数据';
      const encrypted = await AESUtil.encrypt(originalData, testSecretKey);
      const tamperedEncrypted = encrypted.slice(0, -5) + 'XXXXX'; // 篡改最后5个字符

      await expect(AESUtil.decrypt(tamperedEncrypted, testSecretKey)).rejects.toThrow();
    });
  });

  describe('性能测试', () => {
    it('应该能够处理大量数据', async () => {
      const largeData = 'x'.repeat(10000); // 10KB 的数据
      const encrypted = await AESUtil.encrypt(largeData, testSecretKey);
      const decrypted = await AESUtil.decrypt(encrypted, testSecretKey);

      expect(decrypted).toBe(largeData);
      expect(decrypted.length).toBe(10000);
    });
  });
});