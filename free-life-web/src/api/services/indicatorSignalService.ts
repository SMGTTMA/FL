import apiClient from "../apiClient";
import {
  StartSignalWatchParams,
  StopSignalWatchParams,
  SignalWatchListItem,
} from "../types/indicatorSignalTypes";

/** 启动信号监听 */
export const startSignalWatch = (data: StartSignalWatchParams) =>
  apiClient.post<string>({
    url: "/indicator-signal/start",
    data,
  });

/** 停止信号监听 */
export const stopSignalWatch = (data: StopSignalWatchParams) =>
  apiClient.post<string>({
    url: "/indicator-signal/stop",
    data,
  });

/** 获取监听列表 */
export const getSignalWatchList = () =>
  apiClient.post<SignalWatchListItem[]>({
    url: "/indicator-signal/list",
  });

/** 测试发送（参数与 StartSignalWatchDto 一致：symbol, exchangeConfigId） */
export const testSend = (data: StartSignalWatchParams) =>
  apiClient.post<string>({
    url: "/indicator-signal/test-send",
    data,
  });
