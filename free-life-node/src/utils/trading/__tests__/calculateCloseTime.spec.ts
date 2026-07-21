import { calculateCloseTime } from '../trading';

describe('calculateCloseTime', () => {
  describe('分钟周期测试', () => {
    it('应该正确计算1分钟周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1m');
      const expectedTime = new Date('2024-01-01T10:01:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确计算5分钟周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '5m');
      const expectedTime = new Date('2024-01-01T10:05:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确计算15分钟周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '15m');
      const expectedTime = new Date('2024-01-01T10:15:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确计算30分钟周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '30m');
      const expectedTime = new Date('2024-01-01T10:30:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理分钟周期跨小时的情况', () => {
      const openTime = '2024-01-01T10:58:00Z';
      const closeTime = calculateCloseTime(openTime, '5m');
      const expectedTime = new Date('2024-01-01T11:03:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe('小时周期测试', () => {
    it('应该正确计算1小时周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1h');
      const expectedTime = new Date('2024-01-01T11:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确计算4小时周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '4h');
      const expectedTime = new Date('2024-01-01T14:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理小时周期跨天的情况', () => {
      const openTime = '2024-01-01T23:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1h');
      const expectedTime = new Date('2024-01-02T00:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理4小时周期跨天的情况', () => {
      const openTime = '2024-01-01T22:00:00Z';
      const closeTime = calculateCloseTime(openTime, '4h');
      const expectedTime = new Date('2024-01-02T02:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe('日周期测试', () => {
    it('应该正确计算1天周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1d');
      const expectedTime = new Date('2024-01-02T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理日周期跨月的情况', () => {
      const openTime = '2024-01-31T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1d');
      const expectedTime = new Date('2024-02-01T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理日周期跨年的情况', () => {
      const openTime = '2023-12-31T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1d');
      const expectedTime = new Date('2024-01-01T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理2月29日（闰年）的情况', () => {
      const openTime = '2024-02-29T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1d');
      const expectedTime = new Date('2024-03-01T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理2月28日（非闰年）的情况', () => {
      const openTime = '2023-02-28T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1d');
      const expectedTime = new Date('2023-03-01T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe('周周期测试', () => {
    it('应该正确计算1周周期的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1w');
      const expectedTime = new Date('2024-01-08T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理周周期跨月的情况', () => {
      const openTime = '2024-01-28T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1w');
      const expectedTime = new Date('2024-02-04T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理周周期跨年的情况', () => {
      const openTime = '2023-12-28T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1w');
      const expectedTime = new Date('2024-01-04T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe('默认情况测试', () => {
    it('应该对不支持的周期使用默认值（1天）', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, 'unknown');
      const expectedTime = new Date('2024-01-02T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该对空字符串周期使用默认值（1天）', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '');
      const expectedTime = new Date('2024-01-02T10:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe('时间格式测试', () => {
    it('应该正确处理带时区的ISO字符串', () => {
      const openTime = '2024-01-01T10:00:00+08:00';
      const closeTime = calculateCloseTime(openTime, '1h');
      const openDate = new Date(openTime);
      const expectedTime = new Date(openDate);
      expectedTime.setHours(expectedTime.getHours() + 1);
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理UTC时间字符串', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1h');
      const expectedTime = new Date('2024-01-01T11:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理带毫秒的ISO字符串', () => {
      const openTime = '2024-01-01T10:00:00.000Z';
      const closeTime = calculateCloseTime(openTime, '1h');
      const expectedTime = new Date('2024-01-01T11:00:00.000Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe('边界值测试', () => {
    it('应该正确处理午夜时间（00:00）', () => {
      const openTime = '2024-01-01T00:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1h');
      const expectedTime = new Date('2024-01-01T01:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理月末最后一天', () => {
      const openTime = '2024-01-31T23:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1h');
      const expectedTime = new Date('2024-02-01T00:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理年末最后一天', () => {
      const openTime = '2023-12-31T23:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1h');
      const expectedTime = new Date('2024-01-01T00:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });

  describe('实际应用场景测试', () => {
    it('应该正确处理D1日线周期的收盘时间', () => {
      const openTime = '2024-01-01T00:00:00Z';
      const closeTime = calculateCloseTime(openTime, '1d');
      const expectedTime = new Date('2024-01-02T00:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理H4周期在交易场景中的收盘时间', () => {
      const openTime = '2024-01-01T08:00:00Z';
      const closeTime = calculateCloseTime(openTime, '4h');
      const expectedTime = new Date('2024-01-01T12:00:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });

    it('应该正确处理M15周期在交易场景中的收盘时间', () => {
      const openTime = '2024-01-01T10:00:00Z';
      const closeTime = calculateCloseTime(openTime, '15m');
      const expectedTime = new Date('2024-01-01T10:15:00Z');
      expect(closeTime.getTime()).toBe(expectedTime.getTime());
    });
  });
});

