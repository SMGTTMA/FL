import { calculateOrderAndTakeProfitWithKeyPoints } from '../trading';
import { KeyPoint } from 'src/types/trading';

describe('calculateOrderAndTakeProfitWithKeyPoints', () => {
  const closeProfitPoint = 0.01;

  it('buy: 短线关键位能止盈', () => {
    const noOrderKeyPoints: KeyPoint[] = [
      { price: 100, strength: 3, timestamps: [] },
    ];
    const shortKeyPoints: KeyPoint[] = [
      { price: 100, strength: 3, timestamps: [] },
      { price: 120, strength: 2, timestamps: [] },
    ];
    const longKeyPoints: KeyPoint[] = [
      { price: 130, strength: 2, timestamps: [] },
    ];
    const result = calculateOrderAndTakeProfitWithKeyPoints({
      side: 'buy',
      noOrderKeyPoints,
      closeProfitPoint,
      shortKeyPoints,
      longKeyPoints,
    });
    expect(result[0].entryPrice).toBe(100);
    expect(result[0].takeProfitPrice).toBe(120);
  });

  it('sell: 长线关键位能止盈', () => {
    const noOrderKeyPoints: KeyPoint[] = [
      { price: 100, strength: 3, timestamps: [] },
    ];
    const shortKeyPoints: KeyPoint[] = [
      { price: 100, strength: 3, timestamps: [] },
    ];
    const longKeyPoints: KeyPoint[] = [
      { price: 80, strength: 2, timestamps: [] },
      { price: 70, strength: 2, timestamps: [] },
    ];
    const result = calculateOrderAndTakeProfitWithKeyPoints({
      side: 'sell',
      noOrderKeyPoints,
      closeProfitPoint,
      shortKeyPoints,
      longKeyPoints,
    });
    expect(result[0].entryPrice).toBe(100);
    expect(result[0].takeProfitPrice).toBe(80);
  });

  it('buy: 兜底直接取基础止盈价', () => {
    const noOrderKeyPoints: KeyPoint[] = [
      { price: 100, strength: 3, timestamps: [] },
    ];
    const shortKeyPoints: KeyPoint[] = [
      { price: 90, strength: 3, timestamps: [] },
    ];
    const longKeyPoints: KeyPoint[] = [];
    const result = calculateOrderAndTakeProfitWithKeyPoints({
      side: 'buy',
      noOrderKeyPoints,
      closeProfitPoint: 0.05,
      shortKeyPoints,
      longKeyPoints,
    });
    // 100 + 100*0.05 = 105
    expect(result[0].entryPrice).toBe(100);
    expect(result[0].takeProfitPrice).toBe(105);
  });
});