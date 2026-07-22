import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, In, Repository } from 'typeorm';
import {
  ActiveSpotEmaTrade,
  ActiveSpotEmaTradeStatus,
} from './entities/active-spot-ema-trade.entity';

@Injectable()
export class ActiveSpotEmaTradesService {
  constructor(
    @InjectRepository(ActiveSpotEmaTrade)
    private readonly activeSpotEmaTradeRepository: Repository<ActiveSpotEmaTrade>,
  ) {}

  async create(
    input: DeepPartial<ActiveSpotEmaTrade>,
  ): Promise<ActiveSpotEmaTrade> {
    const trade = this.activeSpotEmaTradeRepository.create(input);
    return await this.activeSpotEmaTradeRepository.save(trade);
  }

  async createBatch(
    inputList: DeepPartial<ActiveSpotEmaTrade>[],
  ): Promise<ActiveSpotEmaTrade[]> {
    const trades = this.activeSpotEmaTradeRepository.create(inputList);
    return await this.activeSpotEmaTradeRepository.save(trades);
  }

  async findByStrategyRecordId(
    strategyRecordId: number,
  ): Promise<ActiveSpotEmaTrade[]> {
    return await this.activeSpotEmaTradeRepository.find({
      where: { strategyRecordId },
      order: { createdAt: 'ASC' },
    });
  }

  async findByOrderId(
    exchangeConfigId: number,
    orderId: string,
  ): Promise<ActiveSpotEmaTrade | null> {
    return await this.activeSpotEmaTradeRepository.findOne({
      where: { exchangeConfigId, orderId },
    });
  }

  async findPendingSellByTakeProfitPrice(args: {
    strategyRecordId: number;
    takeProfitPrice: number;
  }): Promise<ActiveSpotEmaTrade | null> {
    return await this.activeSpotEmaTradeRepository.findOne({
      where: {
        strategyRecordId: args.strategyRecordId,
        takeProfitPrice: args.takeProfitPrice,
        tradeStatus: ActiveSpotEmaTradeStatus.PENDING_SELL,
      },
    });
  }

  async update(
    id: number,
    patch: DeepPartial<ActiveSpotEmaTrade>,
  ): Promise<ActiveSpotEmaTrade | null> {
    const trade = await this.activeSpotEmaTradeRepository.findOne({
      where: { id },
    });
    if (!trade) return null;

    Object.assign(trade, patch);
    return await this.activeSpotEmaTradeRepository.save(trade);
  }

  async updateBatch(
    ids: number[],
    patch: DeepPartial<ActiveSpotEmaTrade>,
  ): Promise<ActiveSpotEmaTrade[]> {
    if (!ids.length) return [];

    const trades = await this.activeSpotEmaTradeRepository.find({
      where: { id: In(ids) },
    });
    for (const trade of trades) Object.assign(trade, patch);

    return await this.activeSpotEmaTradeRepository.save(trades);
  }

  async removeByIds(ids: number[]): Promise<void> {
    if (!ids.length) return;
    await this.activeSpotEmaTradeRepository.delete({ id: In(ids) });
  }

  async removeByStrategyRecordId(strategyRecordId: number): Promise<void> {
    await this.activeSpotEmaTradeRepository.delete({ strategyRecordId });
  }
}
