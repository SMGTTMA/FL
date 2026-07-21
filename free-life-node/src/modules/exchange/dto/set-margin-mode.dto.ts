import { IsString, IsEnum, IsNumber } from 'class-validator';

export enum MarginMode {
  // 全仓
  CROSS = 'cross',
  // 逐仓
  ISOLATED = 'isolated',
}

export class SetMarginModeDto {
  @IsNumber()
  exchangeConfigId: number;

  @IsString()
  symbol: string;

  @IsEnum(MarginMode)
  marginMode: MarginMode;

  @IsNumber()
  leverage: number;
}