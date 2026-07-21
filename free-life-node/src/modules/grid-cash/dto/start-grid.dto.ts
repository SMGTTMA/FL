import {
  IsString,
  IsNumber,
  IsNotEmpty,
  Min,
  IsInt,
  IsOptional,
} from 'class-validator';

export class StartGridDto {
  // 交易对 例如：BTC/USDT
  @IsString()
  @IsNotEmpty()
  symbol: string;

  // 策略总仓位大小（USDT）
  @IsNumber()
  @Min(0)
  totalPositionSize: number;

  // 交易所配置ID
  @IsInt()
  @IsNotEmpty()
  exchangeConfigId: number;

  // 配置JSON
  @IsString()
  @IsOptional()
  configJson?: string;
}
