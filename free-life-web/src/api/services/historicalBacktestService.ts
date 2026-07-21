import apiClient from "../apiClient";
import type {
  GridCashKeypointsBacktestRequest,
  GridCashKeypointsBacktestResponse,
  KeypointsV3BacktestRequest,
  KeypointsV3BacktestResponse,
  TrendStrengthBacktestRequest,
  TrendStrengthBacktestResponse,
} from "../types/historicalBacktestTypes";

/** 历史回测 - 关键位 V3 */
export const getKeypointsV3HistoricalBacktest = (
  data: KeypointsV3BacktestRequest,
) =>
  apiClient.post<KeypointsV3BacktestResponse>({
    url: "/historical-backtest/keypoints-v3",
    data,
  });

/** 历史回测 - 现金网格关键位 */
export const getGridCashKeypointsHistoricalBacktest = (
  data: GridCashKeypointsBacktestRequest,
) =>
  apiClient.post<GridCashKeypointsBacktestResponse>({
    url: "/historical-backtest/grid-cash-keypoints",
    data,
  });

/** 历史回测 - 趋势强弱 */
export const getTrendStrengthHistoricalBacktest = (
  data: TrendStrengthBacktestRequest,
) =>
  apiClient.post<TrendStrengthBacktestResponse>({
    url: "/historical-backtest/trend-strength",
    data,
  });
