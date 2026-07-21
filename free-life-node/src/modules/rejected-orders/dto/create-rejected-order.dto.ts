import { IsString, IsEnum, IsObject, IsNumber, IsOptional } from 'class-validator';
import { OperationOrderType } from '../entities/rejected-order.entity';

export class CreateRejectedOrderDto {
  @IsString()
  strategyName: string;

  @IsString()
  symbol: string;

  @IsEnum(OperationOrderType)
  orderType: OperationOrderType;

  @IsObject()
  params: Record<string, any>;

  @IsOptional()
  @IsString()
  rejectReason?: string;

  @IsNumber()
  userId: number;

  @IsNumber()
  exchangeConfigId: number;

  @IsString()
  exchangeName: string;
}