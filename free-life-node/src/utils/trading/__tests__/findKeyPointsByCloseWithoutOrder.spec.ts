import { findKeyPointsByCloseWithoutOrder } from '../trading';
import { KeyPoint } from 'src/types/trading';

describe('findKeyPointsByCloseWithoutOrder', () => {
  const keyPoints: KeyPoint[] = [
    { price: 100, strength: 1, timestamps: [] },
    { price: 110, strength: 1, timestamps: [] },
    { price: 120, strength: 1, timestamps: [] },
  ];
  const openOrders = [
    { price: 110 },
    { price: 120.05 },
  ];

  it('below: 只返回低于 close 且未挂单的关键位', () => {
    const result = findKeyPointsByCloseWithoutOrder({
      keyPoints,
      openOrders,
      close: 115,
      direction: 'below',
    });
    expect(result.map(kp => kp.price)).toEqual([100]);
  });

  it('above: 只返回高于 close 且未挂单的关键位', () => {
    const result = findKeyPointsByCloseWithoutOrder({
      keyPoints,
      openOrders,
      close: 105,
      direction: 'above',
    });
    expect(result.map(kp => kp.price)).toEqual([]);
  });

  it('支持价格容差', () => {
    const result = findKeyPointsByCloseWithoutOrder({
      keyPoints,
      openOrders: [{ price: 120.09 }],
      close: 105,
      direction: 'above',
      priceTolerance: 0.001,
    });
    // 120 距离 120.09 在 0.001 容差内，应被过滤
    expect(result.map(kp => kp.price)).toEqual([110]);
  });
});