import apiClient from "../apiClient";
import type {
  CreateTradingPairDto,
  UpdateTradingPairDto,
  QueryTradingPairDto,
  DisableTradingPairDto,
  TradingPair,
} from "../types/tradingPairsTypes";

/**
 * 创建交易对
 * @param dto 创建参数
 * @returns 创建结果
 */
const create = (dto: CreateTradingPairDto) =>
  apiClient.post({ url: "/tradingPairs/create", data: dto });

/**
 * 更新交易对
 * @param id 交易对ID
 * @param data 更新参数
 * @returns 更新结果
 */
const update = (id: number, data: UpdateTradingPairDto) =>
  apiClient.post({ url: "/tradingPairs/update", data: { id, data } });

/**
 * 删除交易对
 * @param id 交易对ID
 * @returns 删除结果
 */
const remove = (id: number) =>
  apiClient.post({ url: "/tradingPairs/delete", data: { id } });

/**
 * 禁用交易对
 * @param id 交易对ID
 * @returns 禁用结果
 */
const disable = (dto: DisableTradingPairDto) =>
  apiClient.post({ url: "/tradingPairs/disable", data: dto });

/**
 * 启用交易对
 * @param id 交易对ID
 * @returns 启用结果
 */
const enable = (id: number) =>
  apiClient.post({ url: "/tradingPairs/enable", data: { id } });

/**
 * 获取所有交易对
 * @param query 查询参数
 * @returns 交易对列表
 */
const findAll = (query: QueryTradingPairDto = {}) =>
  apiClient.post<TradingPair[]>({
    url: "/tradingPairs/findAll",
    data: query,
  });

/**
 * 获取单个交易对详情
 * @param id 交易对ID
 * @returns 交易对详情
 */
const findOne = (id: number) =>
  apiClient.post({ url: "/tradingPairs/findOne", data: { id } });

export { create, update, remove, disable, enable, findAll, findOne };
