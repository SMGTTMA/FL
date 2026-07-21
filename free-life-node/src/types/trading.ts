/** 公共使用的k线数据类型 */
export interface Kline {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * 关键点位
 */
export interface KeyPoint {
  price: number; // 价格
  strength: number; // 强度（测试次数）
  timestamps: string[]; // 触及该点位的时间点
}

/**
 * Pinbar类型
 */
export type PinbarType = 'hammer' | 'shooting_star';
