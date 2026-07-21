import { IsNumber, IsString, IsOptional, IsEnum } from 'class-validator';

export enum OrderSide {
  BUY = 'buy',
  SELL = 'sell',
}

export enum OrderType {
  LIMIT = 'limit',
  MARKET = 'market',
}

export enum PositionSide {
  NET = 'net',
  LONG = 'long',
  SHORT = 'short',
}

export class PlaceOrderDto {
  @IsString()
  symbol: string;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsEnum(OrderType)
  type: OrderType;

  @IsNumber()
  amount: number;

  @IsNumber()
  @IsOptional()
  price?: number;

  /** 止盈价格 */
  @IsNumber()
  @IsOptional()
  takeProfitPrice?: number;

  @IsString()
  @IsOptional()
  oldOrderId?: string;
}
