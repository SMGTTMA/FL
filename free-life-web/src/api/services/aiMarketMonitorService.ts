import apiClient from "../apiClient";
import type {
  AiMarketMonitorLogListParams,
  AiMarketMonitorLogListResult,
  AiMarketMonitorRuleItem,
  CreateAiMarketMonitorRuleParams,
  StopAiMarketMonitorRuleParams,
  TestAiMarketMonitorRuleParams,
  TestAiMarketMonitorRuleResult,
} from "../types/aiMarketMonitorTypes";

/** AI 市场监控 - 创建规则 */
export const createAiMarketMonitorRule = (
  data: CreateAiMarketMonitorRuleParams
) =>
  apiClient.post<AiMarketMonitorRuleItem>({
    url: "/ai-market-monitor/rule/create",
    data,
  });

/** AI 市场监控 - 查询规则列表 */
export const getAiMarketMonitorRuleList = () =>
  apiClient.post<AiMarketMonitorRuleItem[]>({
    url: "/ai-market-monitor/rule/list",
    data: {},
  });

/** AI 市场监控 - 查询日志列表 */
export const getAiMarketMonitorLogList = (data: AiMarketMonitorLogListParams) =>
  apiClient.post<AiMarketMonitorLogListResult>({
    url: "/ai-market-monitor/log/list",
    data,
  });

/** AI 市场监控 - 停止规则 */
export const stopAiMarketMonitorRule = (data: StopAiMarketMonitorRuleParams) =>
  apiClient.post<string>({
    url: "/ai-market-monitor/rule/stop",
    data,
  });

/** AI 市场监控 - 测试规则 */
export const testAiMarketMonitorRule = (data: TestAiMarketMonitorRuleParams) =>
  apiClient.post<TestAiMarketMonitorRuleResult>({
    url: "/ai-market-monitor/rule/test",
    data,
  });
