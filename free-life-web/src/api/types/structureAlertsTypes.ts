import type {
  StrategyStructureLineItem,
  StrategyKeyLevelItem,
  StrategyTimeframe,
} from "./strategyStructuresTypes";

export type StructureAlertTargetType = "KEY_LEVEL" | "STRUCTURE_LINE";

export type StructureAlertRuleItem = {
  id: number;
  userId: number;
  exchangeConfigId: number;
  symbol: string;
  timeframe: StrategyTimeframe;
  targetType: StructureAlertTargetType;
  targetId: number;
  monitorNear: number;
  monitorBreakUp: number;
  monitorBreakDown: number;
  nearThreshold: number | string | null;
  breakoutThreshold: number | string | null;
  status: number;
  remark: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateStructureAlertRuleParams = {
  exchangeConfigId: number;
  targetType: StructureAlertTargetType;
  targetId: number;
  monitorNear?: boolean;
  monitorBreakUp?: boolean;
  monitorBreakDown?: boolean;
  nearThreshold?: number;
  breakoutThreshold?: number;
  remark?: string;
};

export type QueryStructureAlertRuleParams = {
  symbol?: string;
  timeframe?: StrategyTimeframe;
  targetType?: StructureAlertTargetType;
};

export type UpdateStructureAlertRuleStatusParams = {
  ruleId: number;
};

export type DeleteStructureAlertRuleParams = {
  ruleId: number;
};

export type StructureAlertTargetOption = {
  label: string;
  value: number;
  item: StrategyKeyLevelItem | StrategyStructureLineItem;
};
