import { IsString, IsNumber, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateActiveSpotMartinTradeDto {
  @IsOptional()
  @IsString()
  strategyName?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  entryPrice?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  takeProfitPrice?: number;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  tradeAmount?: number;

  @IsOptional()
  @IsEnum(['buy', 'sell'])
  side?: 'buy' | 'sell';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => Boolean(value))
  isPriceDeviated?: boolean;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value))
  exchangeConfigId?: number;

  @IsOptional()
  @IsString()
  orderId?: string;
}