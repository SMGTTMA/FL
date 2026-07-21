export interface TradingPairInterface {
  id: number;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  type: 'spot' | 'contract';
  exchangeName: string;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}