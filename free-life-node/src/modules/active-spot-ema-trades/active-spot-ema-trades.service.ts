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

  async replaceHoldingsWithPendingSell(args: {
    strategyRecordId: number;
    holdingIds: number[];
    pendingSell: DeepPartial<ActiveSpotEmaTrade>;
  }): Promise<ActiveSpotEmaTrade> {
    const holdingIds = [...new Set(args.holdingIds)];
    if (!holdingIds.length) throw new Error('没有可聚合的持仓记录');

    return await this.activeSpotEmaTradeRepository.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(ActiveSpotEmaTrade);
        const holdings = await repository.find({
          where: {
            id: In(holdingIds),
            strategyRecordId: args.strategyRecordId,
            tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
          },
        });
        if (holdings.length !== holdingIds.length) {
          throw new Error('待聚合持仓已发生变化');
        }

        const pendingSell = repository.create({
          ...args.pendingSell,
          strategyRecordId: args.strategyRecordId,
          tradeStatus: ActiveSpotEmaTradeStatus.PENDING_SELL,
        });
        const saved = await repository.save(pendingSell);
        await repository.delete({ id: In(holdingIds) });
        return saved;
      },
    );
  }

  async mergeHoldingsIntoPendingSell(args: {
    strategyRecordId: number;
    holdingIds: number[];
    pendingSellId: number;
    entryPrice: number;
    tradeAmount: number;
    positionCost: number;
  }): Promise<ActiveSpotEmaTrade> {
    const holdingIds = [...new Set(args.holdingIds)];
    if (!holdingIds.length) throw new Error('没有可并入的持仓记录');

    return await this.activeSpotEmaTradeRepository.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(ActiveSpotEmaTrade);
        const [pendingSell, holdings] = await Promise.all([
          repository.findOne({
            where: {
              id: args.pendingSellId,
              strategyRecordId: args.strategyRecordId,
              tradeStatus: ActiveSpotEmaTradeStatus.PENDING_SELL,
            },
          }),
          repository.find({
            where: {
              id: In(holdingIds),
              strategyRecordId: args.strategyRecordId,
              tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
            },
          }),
        ]);

        if (!pendingSell) throw new Error('待编辑止盈卖单不存在');
        if (holdings.length !== holdingIds.length) {
          throw new Error('待并入持仓已发生变化');
        }

        pendingSell.entryPrice = args.entryPrice;
        pendingSell.tradeAmount = args.tradeAmount;
        pendingSell.positionCost = args.positionCost;
        const saved = await repository.save(pendingSell);
        await repository.delete({ id: In(holdingIds) });
        return saved;
      },
    );
  }
}
