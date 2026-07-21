import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class QueryStrategyRecordDto extends PaginationDto {
  @IsOptional()
  @IsString({ message: 'strategyName 必须为字符串' })
  strategyName?: string;
}