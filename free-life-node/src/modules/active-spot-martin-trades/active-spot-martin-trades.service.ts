import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, DeleteResult } from 'typeorm';
import { ActiveSpotMartinTrade } from './entities/active-spot-martin-trade.entity';
import { CreateActiveSpotMartinTradeDto } from './dto/create-active-spot-martin-trade.dto';
import { UpdateActiveSpotMartinTradeDto } from './dto/update-active-spot-martin-trade.dto';
import { QueryActiveSpotMartinTradeDto } from './dto/query-active-spot-martin-trade.dto';
import { ResponseDto } from '@/common/dto/response.dto';
import { PaginationResponseDto } from '@/common/dto/pagination.dto';

@Injectable()
export class ActiveSpotMartinTradesService {
  constructor(
    @InjectRepository(ActiveSpotMartinTrade)
    private readonly activeSpotMartinTradeRepository: Repository<ActiveSpotMartinTrade>,
  ) {}

  /**
   * 创建活跃现货马丁交易记录
   */
  async singleCreate(
    createDto: CreateActiveSpotMartinTradeDto,
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade>> {
    const trade = this.activeSpotMartinTradeRepository.create({
      ...createDto,
      userId,
    });
    const result = await this.activeSpotMartinTradeRepository.save(trade);
    return ResponseDto.success(result);
  }

  /** 批量创建活跃现货马丁交易记录 */
  async batchCreate(
    createDtoList: CreateActiveSpotMartinTradeDto[],
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade[]>> {
    const list = createDtoList.map((ele) => {
      return {
        ...ele,
        userId,
      };
    });
    const trades = this.activeSpotMartinTradeRepository.create(list);
    const result = await this.activeSpotMartinTradeRepository.save(trades);
    return ResponseDto.success(result);
  }

  /**
   * 查询活跃现货马丁交易记录列表
   */
  async findAll(
    queryDto: QueryActiveSpotMartinTradeDto,
    userId: number,
  ): Promise<ResponseDto<PaginationResponseDto<ActiveSpotMartinTrade>>> {
    const { page = 1, pageSize = 10, ...filters } = queryDto;

    const queryBuilder = this.activeSpotMartinTradeRepository
      .createQueryBuilder('trade')
      .where('trade.userId = :userId', { userId });

    // 添加过滤条件
    if (filters.strategyName) {
      queryBuilder.andWhere('trade.strategyName = :strategyName', {
        strategyName: filters.strategyName,
      });
    }

    if (filters.symbol) {
      queryBuilder.andWhere('trade.symbol = :symbol', {
        symbol: filters.symbol,
      });
    }

    if (filters.side) {
      queryBuilder.andWhere('trade.side = :side', { side: filters.side });
    }

    if (filters.isPriceDeviated !== undefined) {
      queryBuilder.andWhere('trade.isPriceDeviated = :isPriceDeviated', {
        isPriceDeviated: filters.isPriceDeviated,
      });
    }

    if (filters.orderId) {
      queryBuilder.andWhere('trade.orderId = :orderId', {
        orderId: filters.orderId,
      });
    }

    const [trades, total] = await queryBuilder
      .orderBy('trade.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const result = new PaginationResponseDto<ActiveSpotMartinTrade>({
      list: trades,
      total,
      page,
      pageSize,
    });

    return ResponseDto.success(result);
  }

  /**
   * 根据ID查询活跃现货马丁交易记录
   */
  async findOne(
    orderId: string,
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade>> {
    const trade = await this.activeSpotMartinTradeRepository.findOne({
      where: { orderId, userId },
    });

    if (!trade) {
      throw new NotFoundException('活跃现货马丁交易记录不存在');
    }

    return ResponseDto.success(trade);
  }

  /**
   * 批量更新活跃现货马丁交易记录
   */
  async batchUpdate(
    updateDtoList: UpdateActiveSpotMartinTradeDto[],
    strategyName: string,
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade[]>> {
    const trades = await this.activeSpotMartinTradeRepository.find({
      where: { userId, strategyName },
    });

    // 创建 orderId 到 updateDto 的映射，提高查找效率 O(1)
    const updateDtoMap = new Map(
      updateDtoList.map((dto) => [dto.orderId, dto]),
    );

    const tradesToUpdate: ActiveSpotMartinTrade[] = [];

    // 批量准备更新数据
    for (const trade of trades) {
      const updateDto = updateDtoMap.get(trade.orderId);
      if (updateDto) {
        Object.assign(trade, updateDto);
        tradesToUpdate.push(trade);
      }
    }

    // 批量保存 - 一次性更新所有记录，大幅提升性能
    const updatedTrades =
      await this.activeSpotMartinTradeRepository.save(tradesToUpdate);

    return ResponseDto.success(updatedTrades);
  }

  /**
   * 批量更新活跃现货马丁交易记录
   */
  async batchUpdateAndChangeId(
    updateDtoList: Array<
      UpdateActiveSpotMartinTradeDto & { oldOrderId: string }
    >,
    strategyName: string,
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade[]>> {
    const trades = await this.activeSpotMartinTradeRepository.find({
      where: { userId, strategyName },
    });

    // 创建 orderId 到 updateDto 的映射，提高查找效率 O(1)
    const updateDtoMap = new Map(
      updateDtoList.map((dto) => [dto.oldOrderId, dto]),
    );

    const tradesToUpdate: ActiveSpotMartinTrade[] = [];

    // 批量准备更新数据
    for (const trade of trades) {
      // 数据库中存储的orderId就是旧的orderId
      const updateDto = updateDtoMap.get(trade.orderId);
      if (updateDto) {
        const { oldOrderId, ...restUpdateDto } = updateDto;
        tradesToUpdate.push({
          ...trade,
          ...restUpdateDto,
        });
      }
    }

    // 批量保存 - 一次性更新所有记录，大幅提升性能
    const updatedTrades =
      await this.activeSpotMartinTradeRepository.save(tradesToUpdate);

    return ResponseDto.success(updatedTrades);
  }

  /**
   * 批量删除活跃现货马丁交易记录
   */
  async batchRemove(
    orderIds: string[],
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade[]>> {
    // 使用 In 操作符，更符合 TypeORM 的语法
    const trades = await this.activeSpotMartinTradeRepository.find({
      where: { orderId: In(orderIds), userId },
    });

    if (trades.length > 0) {
      await this.activeSpotMartinTradeRepository.remove(trades);
    }

    return ResponseDto.success(trades);
  }

  /** 删除某个策略名称的所有交易记录 */
  async batchRemoveByStrategyName(
    strategyName: string,
    userId: number,
  ): Promise<ResponseDto<DeleteResult>> {
    const result = await this.activeSpotMartinTradeRepository.delete({
      strategyName,
      userId,
    });
    return ResponseDto.success(result);
  }

  /**
   * 根据策略名称查询活跃交易记录
   */
  async findByStrategyName(
    strategyName: string,
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade[]>> {
    const trades = await this.activeSpotMartinTradeRepository.find({
      where: { strategyName, userId },
      order: { createdAt: 'DESC' },
    });
    return ResponseDto.success(trades);
  }

  /**
   * 查询需要重新挂单的交易记录（价格偏离的订单）
   */
  async findPriceDeviatedTrades(
    userId: number,
  ): Promise<ResponseDto<ActiveSpotMartinTrade[]>> {
    const trades = await this.activeSpotMartinTradeRepository.find({
      where: { isPriceDeviated: true, userId },
      order: { createdAt: 'ASC' },
    });
    return ResponseDto.success(trades);
  }
}
