import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RejectedOrder } from './entities/rejected-order.entity';
import { CreateRejectedOrderDto } from './dto/create-rejected-order.dto';
import { QueryRejectedOrderDto } from './dto/query-rejected-order.dto';
import { ResponseDto } from '@/common/dto/response.dto';

@Injectable()
export class RejectedOrdersService {
  constructor(
    @InjectRepository(RejectedOrder)
    private readonly rejectedOrderRepository: Repository<RejectedOrder>,
  ) {}

  /**
   * 创建被拒绝的订单记录
   */
  async create(
    createRejectedOrderDto: CreateRejectedOrderDto,
  ): Promise<ResponseDto<RejectedOrder>> {
    const rejectedOrder = this.rejectedOrderRepository.create(
      createRejectedOrderDto,
    );
    const res = await this.rejectedOrderRepository.save(rejectedOrder);
    return ResponseDto.success(res);
  }

  /**
   * 批量创建被拒绝的订单记录
   */
  async createBatch(
    createRejectedOrderDtos: CreateRejectedOrderDto[],
  ): Promise<ResponseDto<RejectedOrder[]>> {
    const rejectedOrders = this.rejectedOrderRepository.create(
      createRejectedOrderDtos,
    );
    const res = await this.rejectedOrderRepository.save(rejectedOrders);
    return ResponseDto.success(res);
  }

  /**
   * 查询被拒绝的订单记录
   */
  async findAll(queryDto: QueryRejectedOrderDto) {
    const { page = 1, pageSize = 10, ...filters } = queryDto;

    const queryBuilder =
      this.rejectedOrderRepository.createQueryBuilder('rejected_order');

    // 添加过滤条件
    if (filters.strategyName) {
      queryBuilder.andWhere('rejected_order.strategy_name = :strategyName', {
        strategyName: filters.strategyName,
      });
    }

    if (filters.symbol) {
      queryBuilder.andWhere('rejected_order.symbol = :symbol', {
        symbol: filters.symbol,
      });
    }

    if (filters.orderType) {
      queryBuilder.andWhere('rejected_order.order_type = :orderType', {
        orderType: filters.orderType,
      });
    }

    if (filters.userId) {
      queryBuilder.andWhere('rejected_order.user_id = :userId', {
        userId: filters.userId,
      });
    }

    if (filters.exchangeName) {
      queryBuilder.andWhere('rejected_order.exchange_name = :exchangeName', {
        exchangeName: filters.exchangeName,
      });
    }

    // 按创建时间倒序排列
    queryBuilder.orderBy('rejected_order.created_at', 'DESC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return ResponseDto.success({
      data,
      total,
      page,
      pageSize,
    });
  }

  /**
   * 根据ID查询被拒绝的订单记录
   */
  async findOne(id: number): Promise<RejectedOrder> {
    return await this.rejectedOrderRepository.findOne({ where: { id } });
  }

  /**
   * 根据用户ID查询被拒绝的订单记录
   */
  async findByUserId(userId: number, queryDto: QueryRejectedOrderDto) {
    const { page = 1, pageSize = 10, ...filters } = queryDto;

    const queryBuilder =
      this.rejectedOrderRepository.createQueryBuilder('rejected_order');
    queryBuilder.where('rejected_order.user_id = :userId', { userId });

    // 添加其他过滤条件
    if (filters.strategyName) {
      queryBuilder.andWhere('rejected_order.strategy_name = :strategyName', {
        strategyName: filters.strategyName,
      });
    }

    if (filters.symbol) {
      queryBuilder.andWhere('rejected_order.symbol = :symbol', {
        symbol: filters.symbol,
      });
    }

    if (filters.orderType) {
      queryBuilder.andWhere('rejected_order.order_type = :orderType', {
        orderType: filters.orderType,
      });
    }

    if (filters.exchangeName) {
      queryBuilder.andWhere('rejected_order.exchange_name = :exchangeName', {
        exchangeName: filters.exchangeName,
      });
    }

    // 按创建时间倒序排列
    queryBuilder.orderBy('rejected_order.created_at', 'DESC');

    // 分页
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    const [data, total] = await queryBuilder.getManyAndCount();

    return ResponseDto.success({
      data,
      total,
      page,
      pageSize,
    });
  }
}
