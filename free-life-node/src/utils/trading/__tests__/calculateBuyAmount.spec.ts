import { calculateBuyAmount } from '../trading';

describe('calculateBuyAmount', () => {
  it('常规：资金足够，精度8位', () => {
    const amount = calculateBuyAmount({
      price: 2000,
      quoteAmount: 10,
      step: '0.00000001',
      minAmount: 0.00000001,
    });
    expect(amount).toBe(0.005);
  });

  it('常规：资金足够，精度2位', () => {
    const amount = calculateBuyAmount({
      price: 100,
      quoteAmount: 25,
      step: '0.01',
      minAmount: 0.01,
    });
    expect(amount).toBe(0.25);
  });

  it('边界：刚好等于最小买入量', () => {
    const amount = calculateBuyAmount({
      price: 100,
      quoteAmount: 1,
      step: '0.01',
      minAmount: 0.01,
    });
    expect(amount).toBe(0.01);
  });

  it('边界：低于最小买入量应返回最小买入量', () => {
    const amount = calculateBuyAmount({
      price: 1000,
      quoteAmount: 0.5,
      step: '0.01',
      minAmount: 0.01,
    });
    expect(amount).toBe(0.01);
  });

  it('异常：价格为0应抛错', () => {
    expect(() =>
      calculateBuyAmount({
        price: 0,
        quoteAmount: 10,
        step: '0.01',
        minAmount: 0.01,
      })
    ).toThrow('价格必须大于0');
  });

  it('异常：资金为负应抛错', () => {
    expect(() =>
      calculateBuyAmount({
        price: 100,
        quoteAmount: -1,
        step: '0.01',
        minAmount: 0.01,
      })
    ).toThrow('资金不能为负');
  });

  it('异常：步长格式错误应抛错', () => {
    expect(() =>
      calculateBuyAmount({
        price: 100,
        quoteAmount: 10,
        step: '0.0010',
        minAmount: 0.01,
      })
    ).toThrow('步长格式不正确');
  });

  it('异常：最小买入量为0应抛错', () => {
    expect(() =>
      calculateBuyAmount({
        price: 100,
        quoteAmount: 10,
        step: '0.01',
        minAmount: 0,
      })
    ).toThrow('最小买入量必须大于0');
  });
});