import { IsOptional, IsString, IsIn, IsNumber } from 'class-validator';

export class QueryTradingPairDto {
  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsString()
  baseAsset?: string;

  @IsOptional()
  @IsString()
  quoteAsset?: string;

  @IsOptional()
  @IsString()
  @IsIn(['spot', 'contract'])
  type?: 'spot' | 'contract';

  @IsOptional()
  @IsString()
  exchangeName?: string;

  @IsOptional()
  @IsNumber()
  isActive?: number;
}