import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExceptionLog } from './entities/exception-log.entity';
import { ResponseDto } from '@/common/dto/response.dto';

@Injectable()
export class ExceptionLogService {
  constructor(
    @InjectRepository(ExceptionLog)
    private readonly exceptionLogRepository: Repository<ExceptionLog>,
  ) {}

  async create(log: Partial<ExceptionLog>) {
    return this.exceptionLogRepository.save(log);
  }

  async findAll(dto: { page: number; pageSize: number }) {
    const { page, pageSize } = dto;
    const [list, total] = await this.exceptionLogRepository.findAndCount({
      order: { id: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return ResponseDto.success({ list, total, page, pageSize });
  }
}