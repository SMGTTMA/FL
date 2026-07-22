-- 创建数据库
CREATE DATABASE IF NOT EXISTS free_life_trading;

-- 使用数据库
USE free_life_trading;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,       -- 用户名
    password VARCHAR(255) NOT NULL,      -- 加密后的密码
    is_active TINYINT NOT NULL DEFAULT 1,      -- 是否激活
    login_failed_count INT NOT NULL DEFAULT 0, -- 连续登录失败次数
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username)
);

-- 交易所配置表
CREATE TABLE IF NOT EXISTS exchange_configs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                    -- 关联的用户ID
    exchange_name VARCHAR(50) NOT NULL,         -- 交易所名称，目前固定为'OKX'
    config_name VARCHAR(50) NOT NULL,           -- 配置名称，用户自定义
    api_key TEXT NOT NULL,                      -- 加密后的API Key
    secret_key TEXT NOT NULL,                   -- 加密后的Secret Key
    passphrase TEXT NOT NULL,                   -- 加密后的Passphrase
    is_test_net TINYINT NOT NULL DEFAULT 0,    -- 是否是测试网络: 0-生产环境, 1-测试网
    is_active TINYINT NOT NULL DEFAULT 1,       -- 是否启用: 0-禁用, 1-启用
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_exchange (user_id, exchange_name),
    INDEX idx_active_status (is_active),
    UNIQUE KEY uk_user_config_name (user_id, config_name),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 策略记录表
CREATE TABLE IF NOT EXISTS strategy_records (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_name VARCHAR(50) NOT NULL,         -- 策略名称
    symbol VARCHAR(20) NOT NULL,                -- 交易对
    total_position_size DECIMAL(20,8) NOT NULL, -- 总仓位大小(USDT)
    leverage INT NULL,                         -- 杠杆，可以为空
    side ENUM('buy', 'sell') NOT NULL,         -- 订单方向
    boundary_price DECIMAL(20,8) NULL,         -- 边界价格，可以为空
    status TINYINT NOT NULL DEFAULT 0,          -- 策略状态: 0-停止, 1-运行中
    stop_reason VARCHAR(255) NULL,              -- 停止原因
    user_id INT NOT NULL,                    -- 关联的用户ID
    exchange_config_id INT NOT NULL,         -- 关联的交易所配置ID
    parameters JSON,                            -- 策略参数(JSON格式存储)
    last_execution_time TIMESTAMP,              -- 最后执行时间
    mini_position_size DECIMAL(20,8) NULL,      -- 最小仓位大小(USDT)
    config_json TEXT NULL,                      -- 策略配置信息(字符串格式存储)
    is_trading_strategy TINYINT NOT NULL DEFAULT 1, -- 是否是交易策略: 0-非交易策略(如信号监听), 1-交易策略
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_strategy (user_id, strategy_name),
    INDEX idx_status (status),
    INDEX idx_exchange_config (exchange_config_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exchange_config_id) REFERENCES exchange_configs(id)
);

-- 策略关键位表（点位：普通关键位、震荡上下沿）
CREATE TABLE IF NOT EXISTS strategy_key_levels (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                      -- 关联用户ID
    symbol VARCHAR(20) NOT NULL,               -- 交易对，如 BTC/USDT
    timeframe VARCHAR(20) NOT NULL,            -- 周期，如 15m / 1h / 4h / 1d
    price DECIMAL(20,8) NOT NULL,              -- 关键位价格
    level_group ENUM('NORMAL', 'RANGE') NOT NULL DEFAULT 'NORMAL', -- 点位分组：普通点/震荡
    boundary ENUM('UPPER', 'LOWER') NULL,      -- 边界：上沿/下沿（NORMAL 时为空）
    remark VARCHAR(255) NULL,                  -- 备注
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_key_level_slot (user_id, symbol, timeframe, level_group, boundary),
    UNIQUE KEY uk_key_level_price (user_id, symbol, timeframe, price),
    INDEX idx_key_level_context (user_id, symbol, timeframe),
    INDEX idx_key_level_group (level_group, boundary),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 市场结构线表（线：趋势线、通道上下沿）
CREATE TABLE IF NOT EXISTS strategy_structure_lines (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                      -- 关联用户ID
    symbol VARCHAR(20) NOT NULL,               -- 交易对，如 BTC/USDT
    timeframe VARCHAR(20) NOT NULL,            -- 周期，如 15m / 1h / 4h / 1d
    line_group ENUM('TREND', 'CHANNEL') NOT NULL, -- 线分组：趋势线/通道线
    boundary ENUM('UPPER', 'LOWER') NULL,      -- 通道上沿/下沿（TREND 时为空）
    p1_time BIGINT NOT NULL,                   -- 第一锚点时间戳（毫秒）
    p1_price DECIMAL(20,8) NOT NULL,           -- 第一锚点价格
    p2_time BIGINT NOT NULL,                   -- 第二锚点时间戳（毫秒）
    p2_price DECIMAL(20,8) NOT NULL,           -- 第二锚点价格
    remark VARCHAR(255) NULL,                  -- 备注
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_structure_line_slot (user_id, symbol, timeframe, line_group, boundary),
    INDEX idx_structure_line_context (user_id, symbol, timeframe),
    INDEX idx_structure_line_group (line_group, boundary),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 市场方向表（方向：上升/下降/震荡/上升通道/下降通道）
CREATE TABLE IF NOT EXISTS strategy_market_directions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                      -- 关联用户ID
    symbol VARCHAR(20) NOT NULL,               -- 交易对，如 BTC/USDT
    timeframe VARCHAR(20) NOT NULL,            -- 周期，如 15m / 1h / 4h / 1d
    direction ENUM('UP', 'DOWN', 'RANGE', 'UP_CHANNEL', 'DOWN_CHANNEL') NOT NULL, -- 当前方向
    remark VARCHAR(255) NULL,                  -- 备注
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_market_direction_context (user_id, symbol, timeframe),
    INDEX idx_market_direction_context (user_id, symbol, timeframe),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 结构监控规则表（关键位/结构线 + 靠近/突破提醒）
CREATE TABLE IF NOT EXISTS structure_alert_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                           -- 关联用户ID
    exchange_config_id INT NOT NULL,               -- 交易所配置ID
    symbol VARCHAR(20) NOT NULL,                   -- 交易对，如 BTC/USDT
    timeframe ENUM('1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w') NOT NULL, -- 监控周期
    target_type ENUM('KEY_LEVEL', 'STRUCTURE_LINE') NOT NULL, -- 目标类型：关键位/结构线
    target_id INT NOT NULL,                        -- 目标ID，对应 strategy_key_levels.id 或 strategy_structure_lines.id
    monitor_near TINYINT NOT NULL DEFAULT 1,       -- 是否监控靠近
    monitor_break_up TINYINT NOT NULL DEFAULT 1,   -- 是否监控向上突破
    monitor_break_down TINYINT NOT NULL DEFAULT 1, -- 是否监控向下跌破
    near_threshold DECIMAL(12,8) NULL,             -- 靠近阈值，如 0.002 = 0.2%
    breakout_threshold DECIMAL(12,8) NULL,         -- 突破阈值配置，当前版本预留
    status TINYINT NOT NULL DEFAULT 1,             -- 规则状态: 0-禁用, 1-启用
    remark VARCHAR(255) NULL,                      -- 备注
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_structure_alert_user_status (user_id, status),
    INDEX idx_structure_alert_symbol_timeframe_status (symbol, timeframe, status),
    INDEX idx_structure_alert_target (target_type, target_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exchange_config_id) REFERENCES exchange_configs(id)
);

-- 交易对表
CREATE TABLE IF NOT EXISTS trading_pairs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    symbol VARCHAR(30) NOT NULL,                -- 交易对，如 BTC/USDT
    base_asset VARCHAR(20) NOT NULL,            -- 基础币种，如 BTC
    quote_asset VARCHAR(20) NOT NULL,           -- 计价币种，如 USDT
    type ENUM('spot', 'contract') NOT NULL,      -- 交易类型：现货/合约
    exchange_name VARCHAR(50) NOT NULL,         -- 交易所名称
    is_active TINYINT NOT NULL DEFAULT 1,       -- 是否启用
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_symbol_type_exchange (symbol, type, exchange_name),
    INDEX idx_type (type),
    INDEX idx_exchange (exchange_name)
);

-- 异常日志表
CREATE TABLE IF NOT EXISTS exception_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    url VARCHAR(255) NOT NULL,                -- 请求的URL
    method VARCHAR(10) NOT NULL,              -- 请求方法
    status_code INT NOT NULL,                 -- HTTP状态码
    message TEXT NOT NULL,                    -- 错误信息
    stack TEXT NULL,                          -- 堆栈信息
    user_id INT NULL,                      -- 用户ID（可为空）
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status_code (status_code),
    INDEX idx_url (url),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 活跃的现货马丁策略交易记录表（会删除已完成的订单）
CREATE TABLE IF NOT EXISTS active_spot_martin_trades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_name VARCHAR(50) NOT NULL,         -- 策略名称
    symbol VARCHAR(20) NOT NULL,                -- 交易对，如 BTC/USDT
    entry_price DECIMAL(20,8) NULL,        -- 入场价格
    take_profit_price DECIMAL(20,8) NULL,  -- 止盈价格
    trade_amount DECIMAL(20,8) NOT NULL,       -- 交易量
    side ENUM('buy', 'sell') NOT NULL,         -- 交易方向
    is_price_deviated TINYINT NOT NULL DEFAULT 0, -- 是否因价格偏离而取消: 0-正常, 1-已取消待重新挂单
    user_id INT NOT NULL,                    -- 关联的用户ID
    exchange_config_id INT NOT NULL,         -- 关联的交易所配置ID
    order_id VARCHAR(100) NULL,                 -- 交易所订单ID
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_strategy (user_id, strategy_name),
    INDEX idx_symbol (symbol),
    INDEX idx_price_deviated (is_price_deviated),
    INDEX idx_created_at (created_at),
    INDEX idx_exchange_config (exchange_config_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exchange_config_id) REFERENCES exchange_configs(id)
);

-- 活跃的现货 EMA 波段交易记录表（已完成的卖单会删除）
CREATE TABLE IF NOT EXISTS active_spot_ema_trades (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_record_id INT NOT NULL,              -- 关联的策略记录ID
    user_id INT NOT NULL,                         -- 关联用户ID
    exchange_config_id INT NOT NULL,              -- 关联交易所配置ID
    symbol VARCHAR(20) NOT NULL,                   -- 交易对，如 BTC/USDT
    source_mode ENUM('UP', 'RANGE') NULL,          -- 入场来源；聚合卖单可以为空
    signal_timeframe VARCHAR(10) NULL,             -- 入场信号周期；聚合卖单可以为空
    ema_period INT NULL,                           -- 入场使用的EMA周期；聚合卖单可以为空
    signal_kline_time BIGINT NULL,                 -- 入场信号K线时间戳（毫秒）
    entry_price DECIMAL(20,8) NOT NULL,            -- 入场价；聚合卖单保存加权平均入场价
    take_profit_price DECIMAL(20,8) NOT NULL,      -- 最低止盈价
    trade_amount DECIMAL(20,8) NOT NULL,           -- 基础币数量
    position_cost DECIMAL(20,8) NOT NULL,          -- 占用的计价币资金；聚合卖单保存总和
    trade_status ENUM('PENDING_BUY', 'HOLDING', 'PENDING_SELL') NOT NULL,
    order_id VARCHAR(100) NULL,                    -- 当前交易所订单ID；HOLDING时为空
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_active_spot_ema_signal (strategy_record_id, source_mode, signal_kline_time),
    UNIQUE KEY uk_active_spot_ema_order (exchange_config_id, order_id),
    INDEX idx_active_spot_ema_strategy_status (strategy_record_id, trade_status),
    INDEX idx_active_spot_ema_context (user_id, exchange_config_id, symbol),
    INDEX idx_active_spot_ema_take_profit (strategy_record_id, trade_status, take_profit_price),
    FOREIGN KEY (strategy_record_id) REFERENCES strategy_records(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exchange_config_id) REFERENCES exchange_configs(id)
);

-- 被拒绝的订单记录表
CREATE TABLE IF NOT EXISTS rejected_orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_name VARCHAR(50) NOT NULL,         -- 策略名称
    symbol VARCHAR(20) NOT NULL,                -- 交易对，如 BTC/USDT
    order_type ENUM('create', 'edit') NOT NULL, -- 订单类型：创建、编辑
    params JSON NOT NULL,                       -- 请求参数（JSON格式存储）
    reject_reason VARCHAR(500) NULL,            -- 拒绝原因
    user_id INT NOT NULL,                    -- 关联的用户ID
    exchange_config_id INT NOT NULL,         -- 关联的交易所配置ID
    exchange_name VARCHAR(50) NOT NULL,         -- 交易所名称，目前固定为'OKX'
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_strategy (user_id, strategy_name),
    INDEX idx_symbol (symbol),
    INDEX idx_order_type (order_type),
    INDEX idx_created_at (created_at),
    INDEX idx_exchange_config (exchange_config_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exchange_config_id) REFERENCES exchange_configs(id)
);

-- 通用AI对话历史表
CREATE TABLE IF NOT EXISTS ai_conversations (
    id INT PRIMARY KEY AUTO_INCREMENT,
    strategy_type VARCHAR(50) NOT NULL,         -- AI 功能类型
    strategy_id INT NOT NULL,                -- 关联的策略ID
    user_id INT NOT NULL,                    -- 关联的用户ID
    symbol VARCHAR(20) NOT NULL,                -- 交易对，如 BTC/USDT
    prompt TEXT NOT NULL,                       -- 发送给AI的完整prompt
    ai_response TEXT NOT NULL,                  -- AI返回的原始内容
    decision JSON,                              -- 解析后的决策JSON
    execution_result VARCHAR(50),               -- 执行结果：success/failed/skipped/no_action
    error_message TEXT NULL,                    -- 错误信息（如果执行失败）
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_strategy_type (strategy_type),
    INDEX idx_strategy_id (strategy_id),
    INDEX idx_user_id (user_id),
    INDEX idx_symbol (symbol),
    INDEX idx_created_at (created_at),
    INDEX idx_execution_result (execution_result),
    INDEX idx_user_strategy (user_id, strategy_type)
);

-- AI市场监控规则表（自然语言条件 + 定时周期）
CREATE TABLE IF NOT EXISTS ai_market_monitor_rules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,                                -- 关联用户ID
    exchange_config_id INT NOT NULL,                     -- 交易所配置ID
    symbol VARCHAR(20) NOT NULL,                            -- 交易对，如 ETH/USDT
    instruction TEXT NOT NULL,                              -- 用户输入的监控指令（自然语言）
    check_interval ENUM('5m', '30m', '1h', '4h', '1d', '1w') NOT NULL DEFAULT '1h', -- 定时周期
    kline_window INT NOT NULL DEFAULT 24,                   -- 发送给AI的已收盘K线根数
    repeat_monitor TINYINT NOT NULL DEFAULT 0,              -- 是否重复监听: 0-命中一次后自动停止, 1-持续监听
    status TINYINT NOT NULL DEFAULT 1,                      -- 规则状态: 0-停止, 1-运行中
    last_check_at TIMESTAMP NULL,                           -- 最后一次执行检查时间
    last_trigger_at TIMESTAMP NULL,                         -- 最后一次命中并推送时间
    last_ai_response TEXT NULL,                             -- 最近一次AI原始返回
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_status (user_id, status),
    INDEX idx_check_interval (check_interval),
    INDEX idx_symbol (symbol),
    INDEX idx_exchange_config (exchange_config_id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (exchange_config_id) REFERENCES exchange_configs(id)
);

-- AI市场监控执行日志表（每次检查都会记录）
CREATE TABLE IF NOT EXISTS ai_market_monitor_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    rule_id INT NOT NULL,                                -- 规则ID
    user_id INT NOT NULL,                                -- 冗余用户ID，便于查询
    symbol VARCHAR(20) NOT NULL,                            -- 冗余交易对，便于查询
    check_interval ENUM('5m', '30m', '1h', '4h', '1d', '1w') NOT NULL, -- 执行时的周期快照
    check_time TIMESTAMP NOT NULL,                          -- 本次检查时间
    prompt TEXT NULL,                                       -- 发送给AI的prompt
    ai_response TEXT NULL,                                  -- AI原始返回
    decision JSON NULL,                                     -- 解析后的结构化结果
    is_triggered TINYINT NOT NULL DEFAULT 0,                -- 是否命中
    trigger_reason VARCHAR(500) NULL,                       -- 命中/未命中原因摘要
    notify_status VARCHAR(30) NOT NULL,                     -- 推送状态：success/failed/not_needed等
    notify_error TEXT NULL,                                 -- 推送失败原因
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_rule_time (rule_id, check_time),
    INDEX idx_user_time (user_id, check_time),
    INDEX idx_triggered (is_triggered),
    FOREIGN KEY (rule_id) REFERENCES ai_market_monitor_rules(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
