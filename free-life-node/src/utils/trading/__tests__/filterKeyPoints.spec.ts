import { filterKeyPoints } from '../trading';
import { KeyPoint } from 'src/types/trading';

describe('filterKeyPoints', () => {
  const keyPoints: KeyPoint[] = [
    { price: 100, strength: 1, timestamps: [] },
    { price: 110, strength: 1, timestamps: [] },
    { price: 120, strength: 1, timestamps: [] },
  ];

  it('buy: 过滤出大于等于 baseTakeProfitPrice 的关键位', () => {
    const result = filterKeyPoints(keyPoints, 'buy', 110);
    expect(result.map(kp => kp.price)).toEqual([110, 120]);
  });

  it('sell: 过滤出小于等于 baseTakeProfitPrice 的关键位', () => {
    const result = filterKeyPoints(keyPoints, 'sell', 110);
    expect(result.map(kp => kp.price)).toEqual([100, 110]);
  });
});