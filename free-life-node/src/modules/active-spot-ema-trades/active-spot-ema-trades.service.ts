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

  /**
   * 一次性把多组持仓替换成待卖记录。
   * 交易所批量下单成功后，本地数据在同一事务中整体更新。
   */
  async replaceHoldingsWithPendingSells(args: {
    strategyRecordId: number;
    groups: Array<{
      holdingIds: number[];
      pendingSell: DeepPartial<ActiveSpotEmaTrade>;
    }>;
  }): Promise<ActiveSpotEmaTrade[]> {
    if (!args.groups.length) return [];

    const holdingIds = args.groups.flatMap((item) => item.holdingIds);
    const uniqueHoldingIds = [...new Set(holdingIds)];
    if (
      !uniqueHoldingIds.length ||
      uniqueHoldingIds.length !== holdingIds.length
    ) {
      throw new Error('待聚合持仓不存在或重复');
    }

    return await this.activeSpotEmaTradeRepository.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(ActiveSpotEmaTrade);
        const holdings = await repository.find({
          where: {
            id: In(uniqueHoldingIds),
            strategyRecordId: args.strategyRecordId,
            tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
          },
        });
        if (holdings.length !== uniqueHoldingIds.length) {
          throw new Error('待聚合持仓已发生变化');
        }

        const pendingSells = repository.create(
          args.groups.map((item) => ({
            ...item.pendingSell,
            strategyRecordId: args.strategyRecordId,
            tradeStatus: ActiveSpotEmaTradeStatus.PENDING_SELL,
          })),
        );
        const saved = await repository.save(pendingSells);
        await repository.delete({ id: In(uniqueHoldingIds) });
        return saved;
      },
    );
  }

  /** 批量把新持仓并入已存在的止盈卖单。 */
  async mergeHoldingsIntoPendingSells(args: {
    strategyRecordId: number;
    groups: Array<{
      holdingIds: number[];
      pendingSellId: number;
      entryPrice: number;
      tradeAmount: number;
      positionCost: number;
    }>;
  }): Promise<ActiveSpotEmaTrade[]> {
    if (!args.groups.length) return [];

    const holdingIds = args.groups.flatMap((item) => item.holdingIds);
    const uniqueHoldingIds = [...new Set(holdingIds)];
    const pendingSellIds = args.groups.map((item) => item.pendingSellId);
    if (
      !uniqueHoldingIds.length ||
      uniqueHoldingIds.length !== holdingIds.length ||
      new Set(pendingSellIds).size !== pendingSellIds.length
    ) {
      throw new Error('待并入持仓或止盈单不存在或重复');
    }

    return await this.activeSpotEmaTradeRepository.manager.transaction(
      async (manager) => {
        const repository = manager.getRepository(ActiveSpotEmaTrade);
        const [pendingSells, holdings] = await Promise.all([
          repository.find({
            where: {
              id: In(pendingSellIds),
              strategyRecordId: args.strategyRecordId,
              tradeStatus: ActiveSpotEmaTradeStatus.PENDING_SELL,
            },
          }),
          repository.find({
            where: {
              id: In(uniqueHoldingIds),
              strategyRecordId: args.strategyRecordId,
              tradeStatus: ActiveSpotEmaTradeStatus.HOLDING,
            },
          }),
        ]);

        if (pendingSells.length !== pendingSellIds.length) {
          throw new Error('待编辑止盈单已发生变化');
        }
        if (holdings.length !== uniqueHoldingIds.length) {
          throw new Error('待并入持仓已发生变化');
        }

        const groupMap = new Map(
          args.groups.map((item) => [item.pendingSellId, item]),
        );
        for (const pendingSell of pendingSells) {
          const group = groupMap.get(pendingSell.id);
          if (!group) throw new Error('待编辑止盈单已发生变化');
          pendingSell.entryPrice = group.entryPrice;
          pendingSell.tradeAmount = group.tradeAmount;
          pendingSell.positionCost = group.positionCost;
        }
        const saved = await repository.save(pendingSells);
        await repository.delete({ id: In(uniqueHoldingIds) });
        return saved;
      },
    );
  }
}
