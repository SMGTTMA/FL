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
  StartStructureEmaSpotParams,
  EditStructureEmaSpotParams,
  GetStructureEmaSpotConfigResponse,
  ActiveSpotEmaTrade,
  ManualExitStructureEmaSpotParams,
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

/** EMA结构现货策略开启 */
export const startStructureEmaSpotStrategy = (
  data: StartStructureEmaSpotParams,
) =>
  apiClient.post<string>({
    url: "/strategies/structureEmaSpot/start",
    data,
  });

/** EMA结构现货策略停止 */
export const stopStructureEmaSpotStrategy = (data: { strategyId: number }) =>
  apiClient.post<string>({
    url: "/strategies/structureEmaSpot/stop",
    data,
  });

/** EMA结构现货策略编辑 */
export const editStructureEmaSpotStrategy = (
  data: EditStructureEmaSpotParams,
) =>
  apiClient.post<string>({
    url: "/strategies/structureEmaSpot/edit",
    data,
  });

/** EMA结构现货策略默认配置和参数范围 */
export const getStructureEmaSpotStrategyConfig = () =>
  apiClient.post<GetStructureEmaSpotConfigResponse>({
    url: "/strategies/structureEmaSpot/getConfig",
  });

/** 查询EMA结构现货策略的当前交易记录 */
export const getStructureEmaSpotTrades = (data: { strategyId: number }) =>
  apiClient.post<ActiveSpotEmaTrade[]>({
    url: "/strategies/structureEmaSpot/trades",
    data,
  });

/** 暂停EMA结构现货策略创建新买单 */
export const pauseStructureEmaSpotEntry = (data: { strategyId: number }) =>
  apiClient.post<string>({
    url: "/strategies/structureEmaSpot/pauseEntry",
    data,
  });

/** 恢复EMA结构现货策略创建新买单 */
export const resumeStructureEmaSpotEntry = (data: { strategyId: number }) =>
  apiClient.post<string>({
    url: "/strategies/structureEmaSpot/resumeEntry",
    data,
  });

/** 按指定价格手动退出选中的EMA策略持仓 */
export const manualExitStructureEmaSpot = (
  data: ManualExitStructureEmaSpotParams,
) =>
  apiClient.post<string>({
    url: "/strategies/structureEmaSpot/manualExit",
    data,
  });
