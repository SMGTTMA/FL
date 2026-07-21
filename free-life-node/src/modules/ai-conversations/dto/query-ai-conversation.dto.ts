import { IsOptional, IsString, IsNumber } from 'class-validator';
import { PaginationDto } from '@/common/dto/pagination.dto';

/**
 * 查询AI对话记录DTO
 */
export class QueryAiConversationDto extends PaginationDto {
  /** 策略类型（可选） */
  @IsOptional()
  @IsString()
  strategyType?: string;

  /** 策略ID（可选） */
  @IsOptional()
  @IsNumber()
  strategyId?: number;

  /** 用户ID（可选，管理员查询时使用） */
  @IsOptional()
  @IsNumber()
  userId?: number;

  /** 交易对（可选） */
  @IsOptional()
  @IsString()
  symbol?: string;

  /** 执行结果（可选）：success/failed/skipped/no_action */
  @IsOptional()
  @IsString()
  executionResult?: string;
}
