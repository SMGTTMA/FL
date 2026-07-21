/** 网格合约配置 */
export type GridCashConfig = {
    /** 最大开单数量 */
    maxOrderCount: number;
    /** 短周期测试次数 */
    shortTestCount: number;
    /** 短周期价格容忍度 */
    shortPriceTolerance: number;
    /** 长周期测试次数 */
    longTestCount: number;
    /** 长周期价格容忍度 */
    longPriceTolerance: number;
    /** 取消挂单的价格偏移百分比 */
    priceOffsetPercent: number;
    /** 5分钟k线 只取 144 根来计算关键位，约等于 12 小时 */
    fiveMinuteKlineNum: number;
    /** 1小时k线 只取 168 根来计算关键位，等于 1 周 */
    oneHourKlineNum: number;
    /**
     * 历史最高价
     * 若没有设置 则以交易所数据为准
     */
    historyHighPrice?: number;
    /** 盈利收益点 */
    profitPoint: number;
  };
