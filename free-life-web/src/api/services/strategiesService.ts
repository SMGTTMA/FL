import { BasePageDTO } from "#/entity";
import apiClient from "../apiClient";
import {
  AdjustPositionSizeParams,
  GetStrategiesListParams,
  StartMartinGridCashV1StrategyParams,
  StartOneWayMartinContractStrategyParams,
  StrategiesListItem,
  StartGridCashStrategyParams,
  EditGridCashStrategyParams,
  GetGridCashStrategyConfigResponse,
  StartPriceActionSpotParams,
  EditPriceActionSpotParams,
  GetPriceActionSpotStrategyConfigResponse,
} from "../types/strategiesTypes";

/** martinGridCashV1 开启策略 */
export const startMartinGridCashV1Strategy = (
  data: StartMartinGridCashV1StrategyParams
) =>
  apiClient.post<string>({
    url: "/strategies/martinGridCashV1/start",
    data,
  });

/** martinGridCashV1 停止策略 */
export const stopMartinGridCashV1Strategy = (data: { strategyId: number }) =>
  apiClient.post<string>({
    url: "/strategies/martinGridCashV1/stop",
    data,
  });

/** 获取策略列表 */
export const getStrategiesList = (data: GetStrategiesListParams) =>
  apiClient.post<BasePageDTO<StrategiesListItem>>({
    url: "/strategies/list",
    data,
  });

/** 调整仓位大小 */
export const adjustPositionSize = (data: AdjustPositionSizeParams) =>
  apiClient.post<boolean>({
    url: "/strategies/adjustPositionSize",
    data,
  });

/** 单向马丁网格合约策略开启 */
export const startOneWayMartinContractStrategy = (
  data: StartOneWayMartinContractStrategyParams
) =>
  apiClient.post<string>({
    url: "/strategies/oneWayMartinContract/start",
    data,
  });

export const startOneWayMartinContractStrategyV2 = (
  data: StartOneWayMartinContractStrategyParams
) =>
  apiClient.post<string>({
    url: "/strategies/oneWayMartinContractV2/start",
    data,
  });

/** 单向马丁网格合约策略停止 */
export const stopOneWayMartinContractStrategy = (data: {
  strategyId: number;
}) =>
  apiClient.post<string>({
    url: "/strategies/oneWayMartinContract/stop",
    data,
  });

/** 单向马丁网格合约策略停止 */
export const stopOneWayMartinContractStrategyV2 = (data: {
  strategyId: number;
}) =>
  apiClient.post<string>({
    url: "/strategies/oneWayMartinContractV2/stop",
    data,
  });

/** 网格现货策略开启 */
export const startGridSpotStrategy = (data: StartGridCashStrategyParams) =>
  apiClient.post<string>({
    url: "/strategies/gridCash/start",
    data,
  });

/** 网格现货策略停止 */
export const stopGridCashStrategy = (data: { strategyId: number }) =>
  apiClient.post<string>({
    url: "/strategies/gridCash/stop",
    data,
  });

/** 网格现货策略编辑 */
export const editGridCashStrategy = (data: EditGridCashStrategyParams) =>
  apiClient.post<string>({
    url: "/strategies/gridCash/edit",
    data,
  });

/** 网格现货策略config 配置信息 */
export const getGridCashStrategyConfig = () =>
  apiClient.post<GetGridCashStrategyConfigResponse>({
    url: "/strategies/gridCash/getConfig",
  });

/** 价格行为现货策略开启 */
export const startPriceActionSpotStrategy = (
  data: StartPriceActionSpotParams
) =>
  apiClient.post<string>({
    url: "/strategies/priceActionSpot/start",
    data,
  });

/** 价格行为现货策略停止 */
export const stopPriceActionSpotStrategy = (data: { strategyId: number }) =>
  apiClient.post<string>({
    url: "/strategies/priceActionSpot/stop",
    data,
  });

/** 价格行为现货策略编辑 */
export const editPriceActionSpotStrategy = (
  data: EditPriceActionSpotParams
) =>
  apiClient.post<string>({
    url: "/strategies/priceActionSpot/edit",
    data,
  });

/** 价格行为现货策略config 配置信息 */
export const getPriceActionSpotStrategyConfig = () =>
  apiClient.post<GetPriceActionSpotStrategyConfigResponse>({
    url: "/strategies/priceActionSpot/getConfig",
  });
