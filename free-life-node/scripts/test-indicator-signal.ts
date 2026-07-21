/**
 * 技术指标信号检测器测试脚本
 *
 * 使用方法：
 * pnpm ts-node -r tsconfig-paths/register scripts/test-indicator-signal.ts
 *
 * 可选参数：
 * pnpm ts-node -r tsconfig-paths/register scripts/test-indicator-signal.ts --pattern=engulfing
 * pnpm ts-node -r tsconfig-paths/register scripts/test-indicator-signal.ts --all
 */

import { Kline } from '@/types/trading';
import {
  runAllPatternDetectors,
  PatternContext,
  patternDetectors,
} from '@/modules/indicator-signal/patterns';
import { TimeFrame } from '@/modules/exchange/dto/history.dto';

// ============ 工具函数 ============

/**
 * 生成基础 K 线数据
 */
function generateBaseKlines(count: number, startPrice: number = 100): Kline[] {
  const klines: Kline[] = [];
  let price = startPrice;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.5) * 2; // -1 到 1 的随机变化
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * 0.5;
    const low = Math.min(open, close) - Math.random() * 0.5;

    klines.push({
      timestamp: new Date(Date.now() - (count - i) * 3600000).toISOString(),
      open,
      high,
      low,
      close,
      volume: 1000 + Math.random() * 500,
    });

    price = close;
  }

  return klines;
}

/**
 * 创建 K 线
 */
function createKline(
  open: number,
  high: number,
  low: number,
  close: number,
  hoursAgo: number = 0,
): Kline {
  return {
    timestamp: new Date(Date.now() - hoursAgo * 3600000).toISOString(),
    open,
    high,
    low,
    close,
    volume: 1000,
  };
}

// ============ 测试数据构造 ============

/**
 * 构造看涨吞没形态数据
 * 特征：前一根阴线，当前阳线完全吞没前一根
 */
function createBullishEngulfingKlines(): Kline[] {
  const baseKlines = generateBaseKlines(8, 100);
  // 添加看涨吞没形态
  baseKlines.push(createKline(98, 98.5, 95, 95.5, 1)); // 阴线：开 98，收 95.5
  baseKlines.push(createKline(95, 100, 94.5, 99, 0)); // 阳线吞没：开 95，收 99
  return baseKlines;
}

/**
 * 构造看跌吞没形态数据
 * 特征：前一根阳线，当前阴线完全吞没前一根
 */
function createBearishEngulfingKlines(): Kline[] {
  const baseKlines = generateBaseKlines(8, 100);
  // 添加看跌吞没形态
  baseKlines.push(createKline(95, 99, 94.5, 98.5, 1)); // 阳线：开 95，收 98.5
  baseKlines.push(createKline(99, 99.5, 94, 94.5, 0)); // 阴线吞没：开 99，收 94.5
  return baseKlines;
}

/**
 * 构造十字星形态数据
 * 特征：开盘价和收盘价非常接近
 */
function createDojiKlines(): Kline[] {
  const baseKlines = generateBaseKlines(9, 100);
  // 添加十字星
  baseKlines.push(createKline(100, 102, 98, 100.05, 0)); // 十字星：开收价接近
  return baseKlines;
}

/**
 * 构造蜻蜓十字星（T字线）数据
 * 特征：开盘价=收盘价=最高价，长下影线
 */
function createDragonflyDojiKlines(): Kline[] {
  const baseKlines = generateBaseKlines(9, 100);
  // 添加蜻蜓十字星
  baseKlines.push(createKline(100, 100.1, 96, 100, 0)); // 长下影线
  return baseKlines;
}

/**
 * 构造墓碑十字星数据
 * 特征：开盘价=收盘价=最低价，长上影线
 */
function createGravestoneDojiKlines(): Kline[] {
  const baseKlines = generateBaseKlines(9, 100);
  // 添加墓碑十字星
  baseKlines.push(createKline(100, 104, 99.9, 100, 0)); // 长上影线
  return baseKlines;
}

/**
 * 构造早晨之星形态数据
 * 特征：大阴线 + 小实体（跳空低开）+ 大阳线
 */
function createMorningStarKlines(): Kline[] {
  const baseKlines = generateBaseKlines(7, 100);
  // 添加早晨之星形态
  baseKlines.push(createKline(100, 100.5, 95, 95.5, 2)); // 大阴线
  baseKlines.push(createKline(94, 94.5, 93.5, 94.2, 1)); // 小实体，跳空低开
  baseKlines.push(createKline(95, 99, 94.5, 98.5, 0)); // 大阳线
  return baseKlines;
}

/**
 * 构造黄昏之星形态数据
 * 特征：大阳线 + 小实体（跳空高开）+ 大阴线
 */
function createEveningStarKlines(): Kline[] {
  const baseKlines = generateBaseKlines(7, 100);
  // 添加黄昏之星形态
  baseKlines.push(createKline(95, 100, 94.5, 99.5, 2)); // 大阳线
  baseKlines.push(createKline(101, 101.5, 100.5, 101.2, 1)); // 小实体，跳空高开
  baseKlines.push(createKline(100, 100.5, 95, 95.5, 0)); // 大阴线
  return baseKlines;
}

/**
 * 构造看涨锤子线数据
 * bullishhammerstick 要求：
 * - 阳线（close > open）
 * - close ≈ high（差值 <= close * 0.001）
 * - 实体 <= 2 * 下影线
 */
function createBullishHammerKlines(): Kline[] {
  // 构造下跌趋势
  const klines: Kline[] = [];
  klines.push(createKline(110, 111, 107, 108, 8));
  klines.push(createKline(108, 109, 105, 106, 7));
  klines.push(createKline(106, 107, 103, 104, 6));
  klines.push(createKline(104, 105, 101, 102, 5));
  klines.push(createKline(102, 103, 99, 100, 4));
  klines.push(createKline(100, 101, 97, 98, 3));
  klines.push(createKline(98, 99, 95, 96, 2));
  klines.push(createKline(96, 97, 93, 94, 1));

  // 锤子线：close ≈ high，长下影线
  // open=100, close=100.05, high≈100.1, low=94
  // body=0.05, 下影线=6, body <= 2*6 ✓
  klines.push(createKline(100, 100.1, 94, 100.05, 0));
  return klines;
}

/**
 * 构造看跌锤子线（吊颈线）数据
 * hangingman 要求 5 根 K 线：
 * - 前 3 根上涨趋势
 * - 第 4 根是锤子形态（close ≈ high，长下影线）
 * - 第 5 根是确认阴线
 */
function createBearishHammerKlines(): Kline[] {
  const klines: Kline[] = [];

  // 添加一些前置 K 线
  klines.push(createKline(80, 83, 79, 82, 9));
  klines.push(createKline(82, 85, 81, 84, 8));
  klines.push(createKline(84, 87, 83, 86, 7));
  klines.push(createKline(86, 89, 85, 88, 6));
  klines.push(createKline(88, 91, 87, 90, 5));

  // 上涨趋势（前 3 根）
  klines.push(createKline(90, 94, 89, 93, 4));
  klines.push(createKline(93, 97, 92, 96, 3));
  klines.push(createKline(96, 100, 95, 99, 2));

  // 吊颈线：close ≈ high，长下影线
  klines.push(createKline(100, 100.1, 94, 100.05, 1));

  // 确认阴线
  klines.push(createKline(98, 99, 97, 97, 0));

  return klines;
}

/**
 * 构造三只乌鸦数据
 * threeblackcrows 要求：
 * - 前面有上涨趋势
 * - 连续三根大阴线，每根开盘在前一根实体内
 */
function createThreeBlackCrowsKlines(): Kline[] {
  const klines: Kline[] = [];

  // 上涨趋势
  klines.push(createKline(90, 93, 89, 92, 8));
  klines.push(createKline(92, 95, 91, 94, 7));
  klines.push(createKline(94, 97, 93, 96, 6));
  klines.push(createKline(96, 99, 95, 98, 5));
  klines.push(createKline(98, 101, 97, 100, 4));

  // 三只乌鸦：第一根大阴线
  klines.push(createKline(100, 100.5, 96, 96.5, 3));
  // 第二根阴线，开盘在前一根实体内
  klines.push(createKline(99.5, 100, 93, 93.5, 2));
  // 第三根阴线，开盘在前一根实体内
  klines.push(createKline(96.5, 97, 90, 90.5, 1));

  return klines;
}

/**
 * 构造三白兵数据
 * 特征：连续三根阳线，每根开盘价在前一根实体内
 */
function createThreeWhiteSoldiersKlines(): Kline[] {
  const baseKlines = generateBaseKlines(7, 90);
  // 添加三白兵
  baseKlines.push(createKline(90, 94, 89.5, 93.5, 2)); // 第一根大阳线
  baseKlines.push(createKline(93, 97, 92.5, 96.5, 1)); // 第二根阳线
  baseKlines.push(createKline(96, 100, 95.5, 99.5, 0)); // 第三根阳线
  return baseKlines;
}

/**
 * 构造看涨孕线数据
 * 特征：大阴线后跟一根小阳线，小阳线完全在大阴线实体内
 */
function createBullishHaramiKlines(): Kline[] {
  const baseKlines = generateBaseKlines(8, 100);
  // 添加看涨孕线
  baseKlines.push(createKline(100, 100.5, 94, 94.5, 1)); // 大阴线
  baseKlines.push(createKline(96, 97.5, 95.5, 97, 0)); // 小阳线在内
  return baseKlines;
}

/**
 * 构造看跌孕线数据
 * 特征：大阳线后跟一根小阴线，小阴线完全在大阳线实体内
 */
function createBearishHaramiKlines(): Kline[] {
  const baseKlines = generateBaseKlines(8, 100);
  // 添加看跌孕线
  baseKlines.push(createKline(94, 100.5, 93.5, 100, 1)); // 大阳线
  baseKlines.push(createKline(98, 98.5, 96, 96.5, 0)); // 小阴线在内
  return baseKlines;
}

/**
 * 构造乌云盖顶数据
 * 特征：先阳线，再阴线跳空高开后收在阳线实体中部以下
 */
function createDarkCloudCoverKlines(): Kline[] {
  const baseKlines = generateBaseKlines(8, 100);
  // 添加乌云盖顶
  baseKlines.push(createKline(95, 100.5, 94.5, 100, 1)); // 大阳线
  baseKlines.push(createKline(101, 101.5, 96, 96.5, 0)); // 阴线跳空高开，收在阳线中部以下
  return baseKlines;
}

/**
 * 构造刺透形态数据
 * 特征：先阴线，再阳线跳空低开后收在阴线实体中部以上
 */
function createPiercingLineKlines(): Kline[] {
  const baseKlines = generateBaseKlines(8, 100);
  // 添加刺透形态
  baseKlines.push(createKline(100, 100.5, 94, 94.5, 1)); // 大阴线
  baseKlines.push(createKline(93, 99, 92.5, 98.5, 0)); // 阳线跳空低开，收在阴线中部以上
  return baseKlines;
}

// ============ 测试用例定义 ============

interface TestCase {
  name: string;
  expectedPattern: string;
  klines: Kline[];
}

const testCases: TestCase[] = [
  {
    name: '看涨吞没',
    expectedPattern: 'bullish_engulfing',
    klines: createBullishEngulfingKlines(),
  },
  {
    name: '看跌吞没',
    expectedPattern: 'bearish_engulfing',
    klines: createBearishEngulfingKlines(),
  },
  {
    name: '十字星',
    expectedPattern: 'doji',
    klines: createDojiKlines(),
  },
  {
    name: '蜻蜓十字星',
    expectedPattern: 'dragonfly_doji',
    klines: createDragonflyDojiKlines(),
  },
  {
    name: '墓碑十字星',
    expectedPattern: 'gravestone_doji',
    klines: createGravestoneDojiKlines(),
  },
  {
    name: '早晨之星',
    expectedPattern: 'morning_star',
    klines: createMorningStarKlines(),
  },
  {
    name: '黄昏之星',
    expectedPattern: 'evening_star',
    klines: createEveningStarKlines(),
  },
  {
    name: '看涨锤子线',
    expectedPattern: 'bullish_hammer',
    klines: createBullishHammerKlines(),
  },
  {
    name: '吊颈线',
    expectedPattern: 'bearish_hammer',
    klines: createBearishHammerKlines(),
  },
  {
    name: '三只乌鸦',
    expectedPattern: 'three_black_crows',
    klines: createThreeBlackCrowsKlines(),
  },
  {
    name: '三白兵',
    expectedPattern: 'three_white_soldiers',
    klines: createThreeWhiteSoldiersKlines(),
  },
  {
    name: '看涨孕线',
    expectedPattern: 'bullish_harami',
    klines: createBullishHaramiKlines(),
  },
  {
    name: '看跌孕线',
    expectedPattern: 'bearish_harami',
    klines: createBearishHaramiKlines(),
  },
  {
    name: '乌云盖顶',
    expectedPattern: 'dark_cloud_cover',
    klines: createDarkCloudCoverKlines(),
  },
  {
    name: '刺透形态',
    expectedPattern: 'piercing_line',
    klines: createPiercingLineKlines(),
  },
];

// ============ 测试运行 ============

function runTest(testCase: TestCase, verbose: boolean = false): boolean {
  const ctx: PatternContext = {
    symbol: 'BTC/USDT',
    timeframe: TimeFrame.H1,
    env: 'test',
    klines: testCase.klines,
  };

  const results = runAllPatternDetectors(ctx);
  const detected = results.find((r) => r.signal?.type === testCase.expectedPattern);

  if (verbose) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`测试: ${testCase.name}`);
    console.log(`期望检测: ${testCase.expectedPattern}`);
    console.log(`K线数量: ${testCase.klines.length}`);
    console.log(`最后3根K线:`);
    testCase.klines.slice(-3).forEach((k, i) => {
      console.log(
        `  [${i + 1}] 开: ${k.open.toFixed(2)}, 高: ${k.high.toFixed(2)}, 低: ${k.low.toFixed(2)}, 收: ${k.close.toFixed(2)}`,
      );
    });
    console.log(`检测到的形态: ${results.map((r) => r.signal?.type).join(', ') || '无'}`);
  }

  if (detected) {
    if (verbose) {
      console.log(`✅ 通过 - 成功检测到 ${testCase.name}`);
    }
    return true;
  } else {
    if (verbose) {
      console.log(`❌ 失败 - 未检测到 ${testCase.name}`);
    }
    return false;
  }
}

function runAllTests() {
  console.log('\n🔍 开始运行技术指标形态检测测试...\n');
  console.log(`已注册的检测器数量: ${patternDetectors.length}`);
  console.log(
    `检测器列表: ${patternDetectors.map((d) => d.name).join(', ')}\n`,
  );

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const result = runTest(testCase, true);
    if (result) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 测试结果汇总`);
  console.log(`${'='.repeat(50)}`);
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📝 总计: ${testCases.length}`);
  console.log(`${'='.repeat(50)}\n`);

  if (failed > 0) {
    console.log('💡 提示: 某些形态未检测到可能是因为:');
    console.log('   1. 测试数据不够精确，需要调整 K 线参数');
    console.log('   2. technicalindicators 库的检测阈值较严格');
    console.log('   3. 形态检测需要特定的价格比例');
  }
}

function runSinglePattern(patternName: string) {
  const testCase = testCases.find(
    (tc) =>
      tc.name.includes(patternName) || tc.expectedPattern.includes(patternName),
  );

  if (!testCase) {
    console.log(`❌ 未找到匹配的测试用例: ${patternName}`);
    console.log(`可用的测试用例: ${testCases.map((tc) => tc.name).join(', ')}`);
    return;
  }

  console.log(`\n🔍 运行单个形态测试: ${testCase.name}`);
  runTest(testCase, true);
}

// ============ 主程序 ============

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--all')) {
    runAllTests();
  } else {
    const patternArg = args.find((a) => a.startsWith('--pattern='));
    if (patternArg) {
      const patternName = patternArg.split('=')[1];
      runSinglePattern(patternName);
    } else {
      // 直接传入形态名称
      runSinglePattern(args[0]);
    }
  }
}

main();

