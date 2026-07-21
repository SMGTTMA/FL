import { IsNotEmpty, IsNumber } from 'class-validator';

export class StopSignalWatchDto {
  @IsNotEmpty({ message: '监听ID不能为空' })
  @IsNumber()
  watchId: number;
}

