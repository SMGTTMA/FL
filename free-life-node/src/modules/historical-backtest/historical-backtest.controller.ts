import { Body, Controller, Post } from '@nestjs/common';
import { HistoricalBacktestService } from './historical-backtest.service';
import { GetTrendStrengthBacktestDto } from './dto/get-trend-strength-backtest.dto';
import { GetGridCashKeyPointsBacktestDto } from './dto/get-grid-cash-keypoints-backtest.dto';

@Controller('historical-backtest')
export class HistoricalBacktestController {
  constructor(
    private readonly historicalBacktestService: HistoricalBacktestService,
  ) {}

  /**
   * 获取现金网格当前使用的稳定关键位（历史回测视角）
   *
   * 说明：
   * - 直接调用生产策略使用的 calculateKeyPoints 方法
   * - 返回关键位及按当前价格划分后的支撑/阻力
   */
  @Post('grid-cash-keypoints')
  async getGridCashKeyPoints(@Body() dto: GetGridCashKeyPointsBacktestDto) {
    return this.historicalBacktestService.getGridCashKeyPoints(dto);
  }

  /**
   * 获取指定历史时间点的趋势强弱判断（回测视角）
   *
   * 说明：
   * - 前端传入 evaluateAt（回测时间点）
   * - 后端从该时间点向历史截取窗口K线
   * - 调用趋势强弱分析器，返回动量/投影/深度及统一结论
   * - 基于 evaluateAt 之后的K线，返回后续价格行为是否按方向触发（forwardBacktest）
   */
  @Post('trend-strength')
  async getTrendStrength(@Body() dto: GetTrendStrengthBacktestDto) {
    return this.historicalBacktestService.getTrendStrength(dto);
  }
}
