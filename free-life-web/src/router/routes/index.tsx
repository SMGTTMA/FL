import type { AppRouteObject } from "#/router";
import TradingPairsPage from "@/pages/tradingPairsPage/tradingPairsPage";
import ApiConfigPage from "@/pages/apiConfigPage/apiConfigPage";
import UserManagement from "@/pages/userManagement/userManagement";
import ExceptionLog from "@/pages/exceptionLog/exceptionLog";
import GridCash from "@/pages/gridCash/GridCash";
import PriceActionSpot from "@/pages/priceActionSpot/PriceActionSpot";
import IndicatorSignal from "@/pages/indicatorSignal/IndicatorSignal";
import AiConversations from "@/pages/aiConversations/AiConversations";
import AiMarketMonitor from "@/pages/aiMarketMonitor/AiMarketMonitor";
import AiMarketMonitorLog from "@/pages/aiMarketMonitorLog/AiMarketMonitorLog";
import HistoricalBacktest from "@/pages/historicalBacktest/HistoricalBacktest";
import StructureAlerts from "@/pages/structureAlerts/StructureAlerts";
import StrategyStructures from "@/pages/strategyStructures/StrategyStructures";
import StructureEmaSpot from "@/pages/structureEmaSpot/StructureEmaSpot";

export const routes: AppRouteObject[] = [
  {
    path: "/strategyStructures",
    element: <StrategyStructures />,
    meta: {
      label: "结构标记管理",
      key: "/strategyStructures",
    },
  },
  {
    path: "/structureEmaSpot",
    element: <StructureEmaSpot />,
    meta: {
      label: "EMA结构现货",
      key: "/structureEmaSpot",
    },
  },
  {
    path: "/gridCash",
    element: <GridCash />,
    meta: {
      label: "网格现货",
      key: "/gridCash",
    },
  },
  {
    path: "/priceActionSpot",
    element: <PriceActionSpot />,
    meta: {
      label: "价格行为现货",
      key: "/priceActionSpot",
    },
  },
  {
    path: "/structureAlerts",
    element: <StructureAlerts />,
    meta: {
      label: "结构监控",
      key: "/structureAlerts",
    },
  },
  {
    path: "/indicatorSignal",
    element: <IndicatorSignal />,
    meta: {
      label: "技术指标信号",
      key: "/indicatorSignal",
    },
  },
  {
    path: "/aiMarketMonitor",
    element: <AiMarketMonitor />,
    meta: {
      label: "AI市场监控",
      key: "/aiMarketMonitor",
    },
  },
  {
    path: "/aiConversations",
    element: <AiConversations />,
    meta: {
      label: "AI对话记录",
      key: "/aiConversations",
    },
  },
  {
    path: "/historicalBacktest",
    element: <HistoricalBacktest />,
    meta: {
      label: "历史回测",
      key: "/historicalBacktest",
    },
  },
  {
    path: "/aiMarketMonitorLog",
    element: <AiMarketMonitorLog />,
    meta: {
      label: "AI市场监控日志",
      key: "/aiMarketMonitorLog",
    },
  },
  {
    path: "/apiConfigPage",
    element: <ApiConfigPage />,
    meta: {
      label: "API配置",
      key: "/apiConfigPage",
    },
  },
  {
    path: "/tradingPairsPage",
    element: <TradingPairsPage />,
    meta: {
      label: "交易对管理",
      key: "/tradingPairsPage",
      superAdminExclusive: true,
    },
  },
  {
    path: "/userManagement",
    element: <UserManagement />,
    meta: {
      label: "用户管理",
      key: "/userManagement",
      superAdminExclusive: true,
    },
  },
  {
    path: "/exceptionLog",
    element: <ExceptionLog />,
    meta: {
      label: "异常日志",
      key: "/exceptionLog",
      superAdminExclusive: true,
    },
  },
];
