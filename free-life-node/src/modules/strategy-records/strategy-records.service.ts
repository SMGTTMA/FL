import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ResponseDto } from '@/common/dto/response.dto';
import { StrategyRecord } from './entities/strategy-record.entity';
import { ExchangeService } from '@/modules/exchange/exchange.service';
import {
  KlineCacheService,
  KlineEnv,
} from '@/modules/kline-cache/kline-cache.service';
import { QueryStrategyRecordDto } from './dto/query-strategy-record.dto';

@Injectable()
export class StrategyRecordsService {
  constructor(
    @InjectRepository(StrategyRecord)
    private readonly strategyRecordRepository: Repository<StrategyRecord>,
    private readonly exchangeService: ExchangeService,
    private readonly klineCacheService: KlineCacheService,
  ) {}

  /**
   * 计算最小仓位大小
   * 最小仓位 = 最小步长 * 最高价 * 最大开单数量，再转为USDT向上取整
   * @returns 最小仓位大小 USDT 向上取整
   */
  async calculateMinPositionSize(args: {
    symbol: string;
    exchangeConfigId: number;
    env: KlineEnv;
    maxOrderCount: number;
    leverage?: number;
    pairType?: 'spot' | 'contract';
    /** 自己输入的最高价 */
    customInputHighPrice?: number;
  }): Promise<number> {
    const {
      symbol,
      exchangeConfigId,
      env,
      maxOrderCount,
      leverage = 1,
      customInputHighPrice,
    } = args;
    try {
      // 获取市场最小开单信息
      const marketMinOrderInfoRes =
        await this.exchangeService.fetchMarketMinOrderInfo(
          exchangeConfigId,
          symbol,
        );
      if (!marketMinOrderInfoRes?.data) {
        throw new BadRequestException('获取市场最小开单信息失败');
      }

      const { minSz } = marketMinOrderInfoRes.data;

      // 如果自己输入了最高价，则使用自己输入的最高价 计算最小仓位大小
      if (customInputHighPrice) {
        return Math.ceil(
          (minSz * customInputHighPrice * maxOrderCount) / leverage,
        );
      }

      // 获取周线最高价
      const weeklyHighLow = this.klineCacheService.getWeeklyHighLow(
        symbol,
        env,
      );
      if (!weeklyHighLow) {
        throw new BadRequestException('获取周线最高价失败，请等待周线数据更新');
      }

      const { high: weeklyHigh } = weeklyHighLow;

      // 计算最小仓位大小：最小步长 * 最高价 * 最大开单数量
      const minPositionSize = (minSz * weeklyHigh * maxOrderCount) / leverage;

      // 向上取整
      return Math.ceil(minPositionSize);
    } catch (error) {
      throw new BadRequestException(`计算最小仓位大小失败: ${error.message}`);
    }
  }

  /**
   * 获取策略记录列表
   */
  async getList(userId: number, dto: QueryStrategyRecordDto) {
    const { strategyName, page, pageSize } = dto;
    const queryBuilder =
      this.strategyRecordRepository.createQueryBuilder('record');

    // 添加查询条件
    queryBuilder.where('record.userId = :userId', { userId });
    if (strategyName) {
      queryBuilder.andWhere('record.strategyName = :strategyName', {
        strategyName,
      });
    }

    // 添加排序
    queryBuilder.orderBy('record.createdAt', 'DESC');

    if (page && pageSize) {
      const skip = (page - 1) * pageSize;

      // 获取总数
      const total = await queryBuilder.getCount();

      // 获取分页数据
      const list = await queryBuilder.skip(skip).take(pageSize).getMany();

      return ResponseDto.success({
        list,
        total,
        page,
        pageSize,
      });
    } else {
      // 如果不传分页参数，返回所有数据
      const list = await queryBuilder.getMany();
      return ResponseDto.success({
        list,
        total: list.length,
        page: 1,
        pageSize: list.length,
      });
    }
  }

  /**
   * 调整策略仓位大小
   */
  async adjustPositionSize(
    userId: number,
    dto: { id: number; totalPositionSize: number },
  ) {
    const { id, totalPositionSize } = dto;
    const record = await this.strategyRecordRepository.findOne({
      where: { id, userId },
    });
    if (!record) {
      return ResponseDto.error('策略记录不存在或无权限');
    }

    if (record.miniPositionSize) {
      if (totalPositionSize < record.miniPositionSize) {
        return ResponseDto.error('仓位大小不能小于最小仓位大小');
      }
    }

    record.totalPositionSize = totalPositionSize;
    await this.strategyRecordRepository.save(record);
    return ResponseDto.success(true, '仓位调整成功');
  }
}
