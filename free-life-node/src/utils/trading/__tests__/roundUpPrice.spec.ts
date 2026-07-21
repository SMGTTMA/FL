import { roundUpPrice } from '../trading';

describe('roundUpPrice', () => {
  describe('正常情况测试', () => {
    it('应该正确处理数字类型参数', () => {
      const result = roundUpPrice({ price: 123.456, precision: 0.01 });
      expect(result).toBe(123.46);
    });

    it('应该正确处理字符串类型参数', () => {
      const result = roundUpPrice({ price: '123.456', precision: '0.01' });
      expect(result).toBe(123.46);
    });

    it('应该正确处理非常长的数字字符串', () => {
      const result = roundUpPrice({ price: '123.456789', precision: '0.01' });
      expect(result).toBe(123.46);
    });

    it('应该正确处理混合类型参数', () => {
      const result = roundUpPrice({ price: 123.456, precision: '0.1' });
      expect(result).toBe(123.5);
    });

    it('应该正确处理整数精度', () => {
      const result = roundUpPrice({ price: 123.456, precision: 1 });
      expect(result).toBe(124);
    });

    it('应该正确处理大精度值', () => {
      const result = roundUpPrice({ price: 123.456789, precision: 0.001 });
      expect(result).toBe(123.457);
    });

    it('应该正确处理边界值', () => {
      const result = roundUpPrice({ price: 100, precision: 0.01 });
      expect(result).toBe(100);
    });

    it('应该正确处理刚好需要向上取整的情况', () => {
      const result = roundUpPrice({ price: 123.45, precision: 0.01 });
      expect(result).toBe(123.45);
    });

    it('应该正确处理需要向上取整的情况', () => {
      const result = roundUpPrice({ price: 123.451, precision: 0.01 });
      expect(result).toBe(123.46);
    });
  });

  describe('精度测试', () => {
    it('应该正确处理0.1精度', () => {
      const result = roundUpPrice({ price: 123.456, precision: 0.1 });
      expect(result).toBe(123.5);
    });

    it('应该正确处理0.5精度', () => {
      const result = roundUpPrice({ price: 123.456, precision: 0.5 });
      expect(result).toBe(123.5);
    });

    it('应该正确处理0.25精度', () => {
      const result = roundUpPrice({ price: 123.456, precision: 0.25 });
      expect(result).toBe(123.5);
    });

    it('应该正确处理0.0001精度', () => {
      const result = roundUpPrice({ price: 123.456789, precision: 0.0001 });
      expect(result).toBe(123.4568);
    });
  });

  describe('错误情况测试', () => {
    it('应该抛出错误当价格为负数时', () => {
      expect(() => {
        roundUpPrice({ price: -123.456, precision: 0.01 });
      }).toThrow('价格必须大于0且为有效数字');
    });

    it('应该抛出错误当价格为0时', () => {
      expect(() => {
        roundUpPrice({ price: 0, precision: 0.01 });
      }).toThrow('价格必须大于0且为有效数字');
    });

    it('应该抛出错误当精度为负数时', () => {
      expect(() => {
        roundUpPrice({ price: 123.456, precision: -0.01 });
      }).toThrow('精度必须大于0且为有效数字');
    });

    it('应该抛出错误当精度为0时', () => {
      expect(() => {
        roundUpPrice({ price: 123.456, precision: 0 });
      }).toThrow('精度必须大于0且为有效数字');
    });

    it('应该抛出错误当价格为无效字符串时', () => {
      expect(() => {
        roundUpPrice({ price: 'invalid', precision: 0.01 });
      }).toThrow('价格必须大于0且为有效数字');
    });

    it('应该抛出错误当精度为无效字符串时', () => {
      expect(() => {
        roundUpPrice({ price: 123.456, precision: 'invalid' });
      }).toThrow('精度必须大于0且为有效数字');
    });

    it('应该抛出错误当价格为空字符串时', () => {
      expect(() => {
        roundUpPrice({ price: '', precision: 0.01 });
      }).toThrow('价格必须大于0且为有效数字');
    });

    it('应该抛出错误当精度为空字符串时', () => {
      expect(() => {
        roundUpPrice({ price: 123.456, precision: '' });
      }).toThrow('精度必须大于0且为有效数字');
    });
  });

  describe('边界值测试', () => {
    it('应该正确处理极小价格', () => {
      const result = roundUpPrice({ price: 0.000001, precision: 0.000001 });
      expect(result).toBe(0.000001);
    });

    it('应该正确处理极大价格', () => {
      const result = roundUpPrice({ price: 999999.999, precision: 0.01 });
      expect(result).toBe(1000000);
    });

    it('应该正确处理极小精度', () => {
      const result = roundUpPrice({ price: 123.456789, precision: 0.00000001 });
      expect(result).toBe(123.456789);
    });

    it('应该正确处理极大精度', () => {
      const result = roundUpPrice({ price: 123.456, precision: 100 });
      expect(result).toBe(200);
    });
  });

  describe('实际应用场景测试', () => {
    it('应该正确处理加密货币价格', () => {
      const result = roundUpPrice({ price: 0.00012345, precision: 0.00000001 });
      expect(result).toBe(0.00012345);
    });

    it('应该正确处理股票价格', () => {
      const result = roundUpPrice({ price: 123.45, precision: 0.01 });
      expect(result).toBe(123.45);
    });

    it('应该正确处理外汇价格', () => {
      const result = roundUpPrice({ price: 1.23456, precision: 0.00001 });
      expect(result).toBe(1.23456);
    });
  });
});
