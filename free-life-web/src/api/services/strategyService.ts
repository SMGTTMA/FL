import apiClient from "../apiClient";

/**
 * 获取可用的策略列表
 * @returns 策略列表
 */
const getAvailableStrategies = () =>
  apiClient.post<any>({ url: "/v1/available-strategies" });

/**
 * 获取策略的参数配置
 * @returns 策略参数配置
 */
const getStrategyParameters = () =>
  apiClient.post({ url: "/v1/strategy/parameters" });

export { getAvailableStrategies, getStrategyParameters };
