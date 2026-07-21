import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiConversation } from './entities/ai-conversation.entity';
import { CreateAiConversationDto } from './dto/create-ai-conversation.dto';
import { QueryAiConversationDto } from './dto/query-ai-conversation.dto';
import { PaginationResponseDto } from '@/common/dto/pagination.dto';

/**
 * 通用 AI 对话服务
 * AI 功能统一使用该服务记录对话
 */
@Injectable()
export class AiConversationsService {
  constructor(
    @InjectRepository(AiConversation)
    private readonly aiConversationRepository: Repository<AiConversation>,
  ) {}

  /**
   * 创建单条对话记录
   */
  async create(
    dto: CreateAiConversationDto,
  ): Promise<AiConversation> {
    const conversation = this.aiConversationRepository.create(dto);
    return await this.aiConversationRepository.save(conversation);
  }

  /**
   * 批量创建对话记录
   */
  async batchCreate(
    dtos: CreateAiConversationDto[],
  ): Promise<AiConversation[]> {
    const conversations = this.aiConversationRepository.create(dtos);
    return await this.aiConversationRepository.save(conversations);
  }

  /**
   * 根据策略类型和策略ID查询对话历史
   */
  async findByStrategy(
    strategyType: string,
    strategyId: number,
    limit = 10,
  ): Promise<AiConversation[]> {
    return await this.aiConversationRepository.find({
      where: { strategyType, strategyId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 根据用户ID和策略类型查询对话历史
   */
  async findByUserAndType(
    userId: number,
    strategyType: string,
    limit = 10,
  ): Promise<AiConversation[]> {
    return await this.aiConversationRepository.find({
      where: { userId, strategyType },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 根据交易对和策略类型查询对话历史
   */
  async findBySymbolAndType(
    symbol: string,
    strategyType: string,
    limit = 10,
  ): Promise<AiConversation[]> {
    return await this.aiConversationRepository.find({
      where: { symbol, strategyType },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 根据用户ID查询所有对话历史（跨所有策略类型）
   */
  async findByUser(userId: number, limit = 10): Promise<AiConversation[]> {
    return await this.aiConversationRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 根据执行结果查询对话历史
   */
  async findByExecutionResult(
    executionResult: string,
    strategyType?: string,
    limit = 10,
  ): Promise<AiConversation[]> {
    const where: any = { executionResult };
    if (strategyType) {
      where.strategyType = strategyType;
    }

    return await this.aiConversationRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 分页查询所有对话历史（管理员用）
   */
  async findAllWithPagination(
    queryDto: QueryAiConversationDto,
  ): Promise<PaginationResponseDto<AiConversation>> {
    const { page = 1, pageSize = 20, ...filters } = queryDto;

    const where: any = {};
    if (filters.strategyType) {
      where.strategyType = filters.strategyType;
    }
    if (filters.strategyId) {
      where.strategyId = filters.strategyId;
    }
    if (filters.userId) {
      where.userId = filters.userId;
    }
    if (filters.symbol) {
      where.symbol = filters.symbol;
    }
    if (filters.executionResult) {
      where.executionResult = filters.executionResult;
    }

    const [list, total] = await this.aiConversationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return new PaginationResponseDto({
      list,
      total,
      page,
      pageSize,
    });
  }

  /**
   * 分页查询用户的对话历史
   */
  async findByUserIdWithPagination(
    userId: number,
    queryDto: QueryAiConversationDto,
  ): Promise<PaginationResponseDto<AiConversation>> {
    const { page = 1, pageSize = 20, ...filters } = queryDto;

    const where: any = { userId };
    if (filters.strategyType) {
      where.strategyType = filters.strategyType;
    }
    if (filters.strategyId) {
      where.strategyId = filters.strategyId;
    }
    if (filters.symbol) {
      where.symbol = filters.symbol;
    }
    if (filters.executionResult) {
      where.executionResult = filters.executionResult;
    }

    const [list, total] = await this.aiConversationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return new PaginationResponseDto({
      list,
      total,
      page,
      pageSize,
    });
  }
}
