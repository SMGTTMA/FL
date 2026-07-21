import { PaginationDto } from '@/common/dto/pagination.dto';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min, ValidateNested } from 'class-validator';

export class QueryUserDto extends PaginationDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'isActive 只能是 0 或 1' })
  isActive?: number;
}

export class UserIdDto {
  @Type(() => Number)
  @IsInt({ message: 'id 必须为整数' })
  @Min(1, { message: 'id 最小为 1' })
  id: number;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @Type(() => Number)
  @IsIn([0, 1], { message: 'isActive 只能是 0 或 1' })
  isActive?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'loginFailedCount 必须为整数' })
  @Min(0, { message: 'loginFailedCount 最小为 0' })
  loginFailedCount?: number;
}

export class UpdateUserRequestDto extends UserIdDto {
  @ValidateNested()
  @Type(() => UpdateUserDto)
  data: UpdateUserDto;
}
