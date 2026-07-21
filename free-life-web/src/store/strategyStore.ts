import { create } from "zustand";
import { StrategyInfo, StrategyParameters } from "#/entity";
import {
  getAvailableStrategies,
  getStrategyParameters,
} from "@/api/services/strategyService";
import { useRequest } from "ahooks";
import { devtools } from "zustand/middleware";

/**
 * 策略存储状态类型定义
 */
type StrategyStore = {
  /** 策略列表 */
  strategies: StrategyInfo[];
  /** 策略参数配置 */
  parameters: StrategyParameters | null;
  /** 策略相关的操作 */
  actions: {
    /** 设置策略列表 */
    setStrategies: (strategies: StrategyInfo[]) => void;
    /** 清空策略列表 */
    clearStrategies: () => void;
    /** 设置策略参数配置 */
    setParameters: (parameters: StrategyParameters) => void;
    /** 清空策略参数配置 */
    clearParameters: () => void;
  };
};

/**
 * 创建策略状态存储
 */
const useStrategyStore = create<StrategyStore>()(
  devtools((set) => ({
    strategies: [],
    parameters: null,
    actions: {
      setStrategies: (strategies) => {
        set({ strategies });
      },
      clearStrategies: () => {
        set({ strategies: [] });
      },
      setParameters: (parameters) => {
        set({ parameters });
      },
      clearParameters: () => {
        set({ parameters: null });
      },
    },
  }))
);

/**
 * 获取策略列表的 Hook
 * @returns 策略列表
 */
export const useStrategies = () =>
  useStrategyStore((state) => state.strategies);

/**
 * 获取策略参数配置的 Hook
 * @returns 策略参数配置
 */
export const useStrategyParameters = () =>
  useStrategyStore((state) => state.parameters);

/**
 * 获取策略相关操作的 Hook
 * @returns 策略相关操作
 */
export const useStrategyActions = () =>
  useStrategyStore((state) => state.actions);

/**
 * 获取策略列表的 Hook
 * @returns 包含获取策略列表的方法和加载状态
 */
export const useFetchStrategies = () => {
  const { setStrategies } = useStrategyActions();

  const { run: fetch, loading: isLoading } = useRequest(
    getAvailableStrategies,
    {
      manual: true,
      onSuccess: (data) => {
        setStrategies(data);
      },
      onError: (error) => {
        throw error;
      },
    }
  );

  return { fetch, isLoading };
};

/**
 * 获取策略参数配置的 Hook
 * @returns 包含获取策略参数配置的方法和加载状态
 */
export const useFetchStrategyParameters = () => {
  const { setParameters } = useStrategyActions();

  const { run: fetch, loading: isLoading } = useRequest(getStrategyParameters, {
    manual: true,
    onSuccess: (data) => {
      setParameters(data);
    },
    onError: (error) => {
      throw error;
    },
  });

  return { fetch, isLoading };
};

export default useStrategyStore;
