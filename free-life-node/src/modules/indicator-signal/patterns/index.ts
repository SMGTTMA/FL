import { PatternDetector, PatternContext, PatternResult } from './base.pattern';

// 导入所有形态检测器
import { bearishEngulfingDetector } from './bearish-engulfing.pattern';
import { bullishEngulfingDetector } from './bullish-engulfing.pattern';
import { dojiDetector, dragonflyDojiDetector, gravestoneDojiDetector } from './doji.pattern';
import {
  morningStarDetector,
  eveningStarDetector,
  morningDojiStarDetector,
  eveningDojiStarDetector,
  abandonedBabyDetector,
} from './star.pattern';
import {
  bullishHaramiDetector,
  bearishHaramiDetector,
  bullishHaramiCrossDetector,
  bearishHaramiCrossDetector,
} from './harami.pattern';
import {
  bullishHammerDetector,
  bearishHammerDetector,
  bullishInvertedHammerDetector,
  bearishInvertedHammerDetector,
} from './hammer.pattern';
import { bullishMarubozuDetector, bearishMarubozuDetector } from './marubozu.pattern';
// import { bullishSpinningTopDetector, bearishSpinningTopDetector } from './spinning-top.pattern';
import { darkCloudCoverDetector, piercingLineDetector } from './cloud-piercing.pattern';
// import { downsideTasukiGapDetector } from './gap.pattern';
import { threeBlackCrowsDetector, threeWhiteSoldiersDetector } from './three-candle.pattern';

// 导出基础类型
export * from './base.pattern';

/**
 * 所有已注册的形态检测器
 */
export const patternDetectors: PatternDetector[] = [
  // 吞没形态
  bearishEngulfingDetector,
  bullishEngulfingDetector,

  // 十字星形态
  dojiDetector,
  dragonflyDojiDetector,
  gravestoneDojiDetector,

  // 星形态
  morningStarDetector,
  eveningStarDetector,
  morningDojiStarDetector,
  eveningDojiStarDetector,
  abandonedBabyDetector,

  // 孕线形态
  bullishHaramiDetector,
  bearishHaramiDetector,
  bullishHaramiCrossDetector,
  bearishHaramiCrossDetector,

  // 锤子线形态
  bullishHammerDetector,
  bearishHammerDetector,
  bullishInvertedHammerDetector,
  bearishInvertedHammerDetector,

  // 光头光脚形态
  bullishMarubozuDetector,
  bearishMarubozuDetector,

  // 陀螺形态
  // bullishSpinningTopDetector,
  // bearishSpinningTopDetector,

  // 乌云盖顶和刺透形态
  darkCloudCoverDetector,
  piercingLineDetector,

  // 缺口形态
  // downsideTasukiGapDetector,

  // 三根K线形态
  threeBlackCrowsDetector,
  threeWhiteSoldiersDetector,
];

/**
 * 运行所有形态检测器
 */
export function runAllPatternDetectors(ctx: PatternContext): PatternResult[] {
  return patternDetectors
    .map((detector) => detector.detect(ctx))
    .filter((result) => result.detected);
}
