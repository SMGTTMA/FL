export interface ExchangeConfigSimple {
  id: number; // 配置ID
  configName: string; // 配置名称
  exchangeName: string; // 交易所名称
  isTestNet: number; // 是否为测试网
  isActive: number; // 是否激活
}