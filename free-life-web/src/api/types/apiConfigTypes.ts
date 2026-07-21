export type OKXApiConfig = {
  /** 配置ID */
  id: number;
  /** 配置名称 */
  configName: string;
  /** 交易所名称 */
  exchangeName: string;
  /** 是否为测试网 */
  isTestNet: boolean;
  /** 是否激活 */
  isActive: boolean;
};

export type AddOKXApiConfigParams = {
  /** 配置名称 */
  configName: string;
  /** API Key */
  apiKey: string;
  /** Secret Key */
  secretKey: string;
  /** API Passphrase */
  passphrase: string;
  /** 是否为测试网 */
  isTestNet: boolean;
  /** 是否激活 */
  isActive: boolean;
};
