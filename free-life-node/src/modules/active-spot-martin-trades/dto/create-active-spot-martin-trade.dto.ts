import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateActiveSpotMartinTradeDto {
  @IsString()
  strategyName: string;

  @IsString()
  symbol: string;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  entryPrice?: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  takeProfitPrice?: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  tradeAmount: number;

  @IsEnum(['buy', 'sell'])
  side: 'buy' | 'sell';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  isPriceDeviated?: boolean;

  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  exchangeConfigId: number;

  @IsOptional()
  @IsString()
  orderId?: string;
}