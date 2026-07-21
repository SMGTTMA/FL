/**
 * 睡眠
 * @param ms 睡眠时间（毫秒）
 * @returns Promise
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 判断是否为空
 * @param value 值
 * @returns boolean
 */
export const isNil = (value: any): boolean => value == null;

/**
 * @name 解析JSON字符串
 * @param str JSON字符串
 * @param type 解析后的数据类型，用于初始化返回 对象或者数组
 *
 * 注意：
 * 1. type请在非常确定数据类型的情况下使用，
 * 2. 会出现显式的传入了范型，但解析的结果是另一种类型的情况，请做好兼容处理
 * @returns T | null 解析后的数据
 */
export function parseJSON<T = unknown>(
  str: string | undefined | null,
  type?: 'object' | 'array',
): T | null {
  const getEmpty = () => {
    if (type === 'array') {
      return [] as unknown as T;
    } else if (type === 'object') {
      return {} as unknown as T;
    } else {
      return null;
    }
  };

  // isNil
  if (isNil(str)) {
    return getEmpty();
  }

  try {
    return JSON.parse(str) as T;
  } catch {
    return getEmpty();
  }
}

/**
 * 小数点后面保留第 n 位
 * @param x 做近似处理的数
 * @param n 小数点后第 n 位
 * @returns 近似处理后的数
 */
export function roundFractional(value: unknown, n = 2): number | unknown {
  const x = typeof value === 'string' ? parseFloat(value) : value;
  if (typeof x !== 'number') {
    return value;
  }

  if (isNaN(x)) {
    return value;
  }

  return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
}
