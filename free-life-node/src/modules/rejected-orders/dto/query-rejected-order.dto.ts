import { IsOptional, IsString, IsEnum, IsNumber } from 'class-validator';
import { OperationOrderType } from '../entities/rejected-order.entity';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryRejectedOrderDto extends PaginationDto {
  @IsOptional()
  @IsString()
  strategyName?: string;

  @IsOptional()
  @IsString()
  symbol?: string;

  @IsOptional()
  @IsEnum(OperationOrderType)
  orderType?: OperationOrderType;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @IsString()
  exchangeName?: string;
}