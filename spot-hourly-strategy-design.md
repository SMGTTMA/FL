# 日线剧本驱动的小周期现货策略设计

## 1. 策略定位

- 人工通过 **strategy-structures** 维护日线方向和关键位。
- 日线剧本只决定允许使用的 EMA 交易模式，不决定单笔持仓时间。
- 只做现货多头，不做空、不使用杠杆、不执行亏损止损。
- UP / UP_CHANNEL 使用较慢周期、少量大额的 EMA 波段。
- RANGE 使用较快周期、多份小额的 EMA 波段。
- DOWN / DOWN_CHANNEL 不新增仓位。
- 同一用户、交易所配置和交易对同一时间只允许一个自动策略运行。

## 2. 周期与模式

| 人工方向 | 自动模式 | 默认参数 |
| --- | --- | --- |
| **UP / UP_CHANNEL** | UP EMA 波段 | H1、EMA20、资金 3 份 |
| **RANGE** | RANGE EMA 波段 | M5、EMA20、资金 30 份 |
| **DOWN / DOWN_CHANNEL** | 等待 | 禁止新开仓 |
| 方向缺失或结构无效 | 等待 | 禁止新开仓 |

- D1 是固定的人工剧本周期，不开放配置。
- 系统每 5 分钟扫描一次，用于同步订单、响应剧本变化及处理到期买单。
- EMA 信号只在对应模式产生新的已收盘K线时计算。
- UP 周期默认 H1，可选 M30 / H1 / H4。
- RANGE 周期默认 M5，可选 M5 / M15 / M30。

## 3. 日线剧本

- 将 D1 方向和普通关键位按固定顺序序列化并计算 **structureSnapshotHash**，与 strategy-records.parameters 中的已处理哈希比较。
- 订单和持仓不记录剧本版本。
- 剧本更新后，取消全部未成交买单并删除对应本地入场记录；已挂出的卖单不取消。
- 已成交仓位继续按照其来源模式监听 EMA 出场信号。
- 完成切换处理后保存新的 **structureSnapshotHash**；新增、修改或删除关键位都能触发变化。
- UP_CHANNEL 缺少通道线时按普通 UP 处理。
- RANGE 不要求人工提供上沿和下沿。
- 系统最多在 5 分钟内响应人工方向变化；新入场仍等待对应模式的完整 EMA 信号。

## 4. 通用订单规则

第一版统一采用简化判断：

~~~text
本地订单仍在 openOrders
→ 认为订单尚未完成

本地买单不在 openOrders
→ 认为已经买入

本地卖单不在 openOrders
→ 认为已经卖出
~~~

- 不查询订单历史，不区分成交、用户取消、交易所取消或部分成交后取消。
- 不单独处理部分成交；订单消失后按本地记录的完整数量处理。
- 用户在交易所手工操作造成的数量偏差由用户承担。
- 策略主动撤销买单时，必须同步删除本地入场记录，避免被误判为成交。
- 订单幂等键至少包含：策略 ID、来源模式、K线时间、买卖方向和批次 ID。
- 策略只管理自身订单标识和本地记录的数量，不主动使用手工持仓。
- 本地状态依次为 **PENDING_BUY → HOLDING → PENDING_SELL**；HOLDING 没有交易所订单 ID。
- PENDING_BUY 和 HOLDING 分别保存来源模式、信号周期、EMA周期、信号K线时间、开仓价、最低止盈价、数量和占用资金。
- 一个非空交易所订单 ID 只对应一条本地记录。

止盈卖单统一合并规则：

- 同一策略、交易所配置和交易对中，经交易所价格精度处理后止盈价相同的批次，合并为一个卖单；UP 和 RANGE 仓位统一适用。
- 没有对应卖单时，数量和占用资金分别求和，入场价按数量加权；交易所创建成功后，删除原 HOLDING 记录并创建一条聚合的 PENDING_SELL 记录。
- 已有对应卖单时，编辑交易所卖单数量；编辑成功后删除新并入的 HOLDING 记录，并更新原 PENDING_SELL 的数量、占用资金和加权入场价。
- 聚合后不再保留各原始批次的独立记录，也不让多条本地记录共享 order ID。
- PENDING_SELL 不在 openOrders 后认为已经卖出，删除这一条本地记录并释放其全部占用资金。

## 5. 资金和最低盈利

设策略预算为 **strategyBudget**：

~~~text
occupiedCapital = 未退出持仓成本 + 未成交买单冻结资金
availableCapital = max(strategyBudget - occupiedCapital, 0)

slotCapital = strategyBudget / currentProfile.positionParts
~~~

- UP 和 RANGE 分别使用自己的 **positionParts**。
- 每次开仓占用一个完整槽位，可用资金不足一个完整槽位时不开碎片单。
- 未成交买单和未退出持仓都占用资金。
- 买单取消或仓位卖出后释放资金。
- 旧模式仓位继续占用预算，新模式只能使用剩余可用资金。
- 同一来源模式最多存在该模式 **positionParts** 个未结束批次。

### 5.1 运行中修改预算

- 已有批次保存创建时的 **slotCapitalSnapshot**，不随预算变化增减仓。
- 新批次使用修改后的预算和当前模式份数计算槽位。
- 已占用资金超过新预算时停止新开仓，等待资金释放。

### 5.2 最低盈利价

~~~text
minTakeProfitPrice = entryPrice × (1 + profitPoint)
~~~

- **profitPoint** 是开仓价到最低止盈价的涨幅，配置值本身应覆盖手续费并留下目标利润。
- UP 和 RANGE 共用该参数，不再单独计算交易成本或最小净利润率。

## 6. 统一 EMA 波段逻辑

### 6.1 EMA 信号

EMA 使用当前模式配置的周期和 EMA 长度，只处理已经收盘的K线。

~~~text
bodyMid = (open + close) / 2
~~~

开仓信号：

~~~text
previousBodyMid <= previousEMA
currentBodyMid  > currentEMA
currentClose    > currentEMA
currentClose    > currentOpen
~~~

退出信号：

~~~text
previousBodyMid >= previousEMA
currentBodyMid  < currentEMA
currentClose    < currentEMA
currentClose    < currentOpen
~~~

### 6.2 开仓条件

还必须满足：

- 当前人工方向允许该模式开仓。
- 当前信号K线尚未处理。
- 至少有一个完整空闲槽位。
- UP 计划买入价与其他未成交 UP 买单的距离超过 **up.entrySpacingRate**。
- UP 计划买入价与上方最近人工关键位的距离超过 **up.keyLevelAvoidanceRate**，或不存在上方关键位。
- RANGE 计划买入价与未成交 RANGE 买单及未退出 RANGE 持仓的距离超过 **range.entrySpacingRate**。

策略启动或切换到 UP / RANGE 时，如果价格已经位于对应 EMA 上方，不立即追价，等待下一次完整的下方到上方穿越。

### 6.3 买单

~~~text
plannedEntryPrice = 信号K线收盘价
orderCapital = slotCapitalSnapshot
~~~

- 使用限价买单，不使用市价买入。
- 有效期为当前模式 **entryOrderExpireBars** 根K线，默认 1 根。
- 系统扫描任务不追价、不修改买入价格。
- 达到有效K线数仍未完成时，取消订单并删除本地入场记录。
- 订单仍在 openOrders 时继续等待；消失时按本地完整数量认为已经买入。

### 6.4 出场

- 每个持仓始终按照其来源模式保存的信号周期和 EMA 周期监听出场，不受当前日线方向影响。
- 出现对应 EMA 退出信号且当前收盘价不低于最低盈利价时，按最低盈利价挂限价卖单。
- 出现退出信号但当前收盘价低于最低盈利价时不挂卖单，继续持有并等待后续有效出场信号。
- 卖单不在 openOrders 后认为已经卖出，删除本地批次并释放资金。

### 6.5 UP 人工关键位突破止盈

该规则只用于 UP 来源仓位。设上方人工普通关键位为 **R**：

~~~text
previousBodyMid <= R
currentBodyMid  > R
currentClose    > R
currentClose    > currentOpen
~~~

确认突破后：

- 取消未成交 UP 买单并删除本地入场记录。
- 当前收盘价不低于最低盈利价的 UP 批次，按最低盈利价整体挂单止盈。
- 当前收盘价低于最低盈利价的批次继续持有，等待后续有效出场信号。
- 关键位突破止盈优先于 EMA 退出。
- 将该关键位标记为已突破，后续寻找更高关键位；人工剧本再次更新后重置标记。
- 止盈后仍需等待下一次完整 EMA 穿越才能重新开仓。

## 7. 方向和计划切换

系统发现当前 **structureSnapshotHash** 与已处理哈希不同时立即处理：

- 取消全部未成交买单，并同步删除对应本地入场记录。
- 已挂出的卖单继续等待，不取消、不改价。
- 已成交仓位继续按照各自来源模式的 EMA 参数监听出场。
- 剧本离开某个可交易模式时，对该模式仓位额外执行一次出场判断：达到最低盈利价则挂单退出，否则继续持有。
- 新方向为 UP / UP_CHANNEL 时，启用 UP 参数并等待下一次完整开仓信号。
- 新方向为 RANGE 时，启用 RANGE 参数并等待下一次完整开仓信号。
- 新方向为 DOWN / DOWN_CHANNEL 时禁止新开仓。
- 处理完成后保存新的 **structureSnapshotHash**。

## 8. 停止与重启

### 8.1 用户停止

- 删除当前策略全部本地活跃交易记录。
- 将策略状态改为停止，不再执行扫描或 EMA 任务。
- 不取消交易所买卖订单，不处理现货。
- 交易所订单和现货交给用户手工管理。

### 8.2 服务重启

读取本地记录和当前策略 openOrders：

- 先计算并比较 **structureSnapshotHash**，补做未处理的剧本切换。
- 本地订单仍在 openOrders：继续等待。
- 本地买单不在 openOrders：认为已经买入。
- 本地卖单不在 openOrders：认为已经卖出并删除记录。
- 已成交仓位恢复其来源模式的 EMA 出场监听。

## 9. 默认配置

**strategyBudget** 在启动策略时必填，不提供默认值。其余默认配置：

~~~json
{
  "profitPoint": 0.013,
  "up": {
    "timeframe": "1h",
    "emaPeriod": 20,
    "positionParts": 3,
    "entrySpacingRate": 0.01,
    "keyLevelAvoidanceRate": 0.01,
    "entryOrderExpireBars": 1
  },
  "range": {
    "timeframe": "5m",
    "emaPeriod": 20,
    "positionParts": 30,
    "entrySpacingRate": 0.002,
    "entryOrderExpireBars": 1
  }
}
~~~

- UP timeframe 可选 M30 / H1 / H4。
- RANGE timeframe 可选 M5 / M15 / M30。
- 价格精度、数量步长、最小下单量、最小下单金额和交易所余额动态读取，不作为策略配置。
