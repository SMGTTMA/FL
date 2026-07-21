import { TimeFrame } from '@/modules/exchange/dto/history.dto';

export enum MonitorCheckInterval {
  M5 = '5m',
  M30 = '30m',
  H1 = '1h',
  H4 = '4h',
  D1 = '1d',
  W1 = '1w',
}

export interface MonitorDecision {
  matched: boolean;
  confidence: number;
  reason: string;
}

export type MonitorNotifyStatus =
  | 'not_needed'
  | 'success'
  | 'failed'
  | 'data_insufficient'
  | 'config_invalid'
  | 'skipped_not_due';

export const CHECK_INTERVAL_MS_MAP: Record<MonitorCheckInterval, number> = {
  [MonitorCheckInterval.M5]: 5 * 60 * 1000,
  [MonitorCheckInterval.M30]: 30 * 60 * 1000,
  [MonitorCheckInterval.H1]: 60 * 60 * 1000,
  [MonitorCheckInterval.H4]: 4 * 60 * 60 * 1000,
  [MonitorCheckInterval.D1]: 24 * 60 * 60 * 1000,
  [MonitorCheckInterval.W1]: 7 * 24 * 60 * 60 * 1000,
};

/**
 * 默认窗口：
 * 1. 分钟/小时级别尽量覆盖 1 天
 * 2. 4 小时覆盖约 1 周
 * 3. 日线/周线给更长历史，便于 AI 判断结构
 */
export const CHECK_INTERVAL_DEFAULT_WINDOW_MAP: Record<
  MonitorCheckInterval,
  number
> = {
  [MonitorCheckInterval.M5]: 288,
  [MonitorCheckInterval.M30]: 48,
  [MonitorCheckInterval.H1]: 24,
  [MonitorCheckInterval.H4]: 42,
  [MonitorCheckInterval.D1]: 30,
  [MonitorCheckInterval.W1]: 26,
};

export function intervalToTimeframe(interval: MonitorCheckInterval): TimeFrame {
  return interval as unknown as TimeFrame;
}
