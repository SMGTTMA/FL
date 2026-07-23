import { ResponseDto } from '@/common/dto/response.dto';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  BatchCreateStrategyKeyLevelDto,
  BatchCreateStrategyKeyLevelItemDto,
} from './dto/batch-create-strategy-key-level.dto';
import { CreateStrategyKeyLevelDto } from './dto/create-strategy-key-level.dto';
import { DeleteBatchStrategyKeyLevelDto } from './dto/delete-batch-strategy-key-level.dto';
import { DeleteBatchStrategyStructureLineDto } from './dto/delete-batch-strategy-structure-line.dto';
import { DeleteBatchStrategyMarketDirectionDto } from './dto/delete-batch-strategy-market-direction.dto';
import { QueryStrategyKeyLevelDto } from './dto/query-strategy-key-level.dto';
import { QueryStrategyMarketDirectionListDto } from './dto/query-strategy-market-direction-list.dto';
import { QueryStrategyMarketDirectionDto } from './dto/query-strategy-market-direction.dto';
import { QueryStrategyStructureLineDto } from './dto/query-strategy-structure-line.dto';
import { SetStrategyMarketDirectionDto } from './dto/set-strategy-market-direction.dto';
import { UpdateStrategyKeyLevelDto } from './dto/update-strategy-key-level.dto';
import { UpdateStrategyStructureLineDto } from './dto/update-strategy-structure-line.dto';
import {
  StrategyBoundary,
  StrategyLevelGroup,
  StrategyLineGroup,
} from './constants/strategy-structure.constants';
import { CreateStrategyStructureLineDto } from './dto/create-strategy-structure-line.dto';
import { StrategyMarketDirection } from './entities/strategy-market-direction.entity';
import { StrategyKeyLevel } from './entities/strategy-key-level.entity';
import { StrategyStructureLine } from './entities/strategy-structure-line.entity';

@Injectable()
export class StrategyStructuresService {
  constructor(
    @InjectRepository(StrategyKeyLevel)
    private readonly strategyKeyLevelRepository: Repository<StrategyKeyLevel>,
    @InjectRepository(StrategyStructureLine)
    private readonly strategyStructureLineRepository: Repository<StrategyStructureLine>,
    @InjectRepository(StrategyMarketDirection)
    private readonly strategyMarketDirectionRepository: Repository<StrategyMarketDirection>,
  ) {}

  async create(dto: CreateStrategyKeyLevelDto, userId: number) {
    const context = this.normalizeContext(userId, dto.symbol, dto.timeframe);
    this.validatePrice(dto.price, 'price');
    const boundary = this.resolveLevelBoundaryForCreate(
      dto.levelGroup,
      dto.boundary,
    );

    const existed = await this.getKeyLevelsByContext(context);
    this.assertKeyLevelNoConflict(
      existed,
      {
        price: dto.price,
        levelGroup: dto.levelGroup,
        boundary,
      },
      undefined,
    );

    const keyLevel = this.strategyKeyLevelRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      timeframe: context.timeframe,
      price: dto.price,
      levelGroup: dto.levelGroup,
      boundary,
      remark: this.normalizeRemark(dto.remark),
    });

    const saved = await this.strategyKeyLevelRepository.save(keyLevel);
    return ResponseDto.success(saved);
  }

  async createBatch(dto: BatchCreateStrategyKeyLevelDto, userId: number) {
    const context = this.normalizeContext(userId, dto.symbol, dto.timeframe);

    const inputKeySet = new Set<string>();
    const inputRangeSlotSet = new Set<string>();
    const normalizedItems = dto.items.map((item) =>
      this.normalizeBatchItem(item),
    );

    for (const item of normalizedItems) {
      this.validatePrice(item.price, 'price');
      const key = this.toPriceKey(item.price);
      if (inputKeySet.has(key)) {
        throw new BadRequestException('批量数据中存在重复关键位价格');
      }
      inputKeySet.add(key);

      if (item.levelGroup === 'RANGE') {
        const slotKey = this.toRangeSlotKey(item.boundary!);
        if (inputRangeSlotSet.has(slotKey)) {
          throw new BadRequestException('批量数据中存在重复震荡上下沿');
        }
        inputRangeSlotSet.add(slotKey);
      }
    }

    const existingList = await this.getKeyLevelsByContext(context);
    for (const item of normalizedItems) {
      this.assertKeyLevelNoConflict(existingList, item, undefined);
    }

    const entities = normalizedItems.map((item) =>
      this.strategyKeyLevelRepository.create({
        userId: context.userId,
        symbol: context.symbol,
        timeframe: context.timeframe,
        price: item.price,
        levelGroup: item.levelGroup,
        boundary: item.boundary,
        remark: item.remark,
      }),
    );

    const saved = await this.strategyKeyLevelRepository.save(entities);
    return ResponseDto.success(saved);
  }

  async update(dto: UpdateStrategyKeyLevelDto, userId: number) {
    const keyLevel = await this.strategyKeyLevelRepository.findOne({
      where: {
        id: dto.id,
        userId,
      },
    });
    if (!keyLevel) {
      throw new BadRequestException('关键位不存在或无权限修改');
    }

    const nextPrice = dto.price ?? Number(keyLevel.price);
    if (dto.price !== undefined) {
      this.validatePrice(dto.price, 'price');
    }

    const nextLevelGroup = dto.levelGroup ?? keyLevel.levelGroup;
    const nextBoundary = this.resolveLevelBoundaryForUpdate(
      nextLevelGroup,
      dto.boundary,
      keyLevel.boundary,
    );

    const context = this.normalizeContext(
      userId,
      keyLevel.symbol,
      keyLevel.timeframe,
    );
    const existingList = await this.getKeyLevelsByContext(context);
    this.assertKeyLevelNoConflict(
      existingList,
      {
        price: nextPrice,
        levelGroup: nextLevelGroup,
        boundary: nextBoundary,
      },
      keyLevel.id,
    );

    keyLevel.price = nextPrice;
    keyLevel.levelGroup = nextLevelGroup;
    keyLevel.boundary = nextBoundary;

    if (dto.remark !== undefined) {
      keyLevel.remark = this.normalizeRemark(dto.remark);
    }

    const updated = await this.strategyKeyLevelRepository.save(keyLevel);
    return ResponseDto.success(updated);
  }

  async list(dto: QueryStrategyKeyLevelDto, userId: number) {
    const symbol = this.normalizeOptionalText(dto.symbol, 'symbol');
    const timeframe = this.normalizeOptionalText(dto.timeframe, 'timeframe');

    const list = await this.strategyKeyLevelRepository.find({
      where: {
        userId,
        ...(symbol ? { symbol } : {}),
        ...(timeframe ? { timeframe } : {}),
        ...(dto.levelGroup ? { levelGroup: dto.levelGroup } : {}),
      },
      order: {
        symbol: 'ASC',
        timeframe: 'ASC',
        levelGroup: 'ASC',
        boundary: 'ASC',
        price: 'ASC',
        id: 'ASC',
      },
    });

    return ResponseDto.success(list);
  }

  async deleteBatch(dto: DeleteBatchStrategyKeyLevelDto, userId: number) {
    const levels = await this.strategyKeyLevelRepository.find({
      where: {
        id: In(dto.ids),
        userId,
      },
      select: ['id'],
    });

    if (!levels.length) {
      return ResponseDto.success({
        deletedCount: 0,
        ids: [],
      });
    }

    const ownedIds = levels.map((item) => item.id);
    const result = await this.strategyKeyLevelRepository.delete({
      id: In(ownedIds),
      userId,
    });

    return ResponseDto.success({
      deletedCount: result.affected || 0,
      ids: ownedIds,
    });
  }

  async createLine(dto: CreateStrategyStructureLineDto, userId: number) {
    const context = this.normalizeContext(userId, dto.symbol, dto.timeframe);
    this.validatePrice(dto.p1Price, 'p1Price');
    this.validatePrice(dto.p2Price, 'p2Price');
    this.validateLineTimes(dto.p1Time, dto.p2Time);

    const boundary = this.resolveLineBoundaryForCreate(
      dto.lineGroup,
      dto.boundary,
    );
    const existed = await this.getLinesByContext(context);
    this.assertLineNoConflict(
      existed,
      {
        lineGroup: dto.lineGroup,
        boundary,
      },
      undefined,
    );

    const entity = this.strategyStructureLineRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      timeframe: context.timeframe,
      lineGroup: dto.lineGroup,
      boundary,
      p1Time: dto.p1Time,
      p1Price: dto.p1Price,
      p2Time: dto.p2Time,
      p2Price: dto.p2Price,
      remark: this.normalizeRemark(dto.remark),
    });
    const saved = await this.strategyStructureLineRepository.save(entity);
    return ResponseDto.success(saved);
  }

  async updateLine(dto: UpdateStrategyStructureLineDto, userId: number) {
    const line = await this.strategyStructureLineRepository.findOne({
      where: {
        userId,
        id: dto.id,
      },
    });
    if (!line) {
      throw new BadRequestException('结构线不存在或无权限修改');
    }

    const nextLineGroup = dto.lineGroup ?? line.lineGroup;
    const nextBoundary = this.resolveLineBoundaryForUpdate(
      nextLineGroup,
      dto.boundary,
      line.boundary,
    );
    const nextP1Time = dto.p1Time ?? Number(line.p1Time);
    const nextP2Time = dto.p2Time ?? Number(line.p2Time);
    const nextP1Price = dto.p1Price ?? Number(line.p1Price);
    const nextP2Price = dto.p2Price ?? Number(line.p2Price);

    this.validatePrice(nextP1Price, 'p1Price');
    this.validatePrice(nextP2Price, 'p2Price');
    this.validateLineTimes(nextP1Time, nextP2Time);

    const context = this.normalizeContext(userId, line.symbol, line.timeframe);
    const existed = await this.getLinesByContext(context);
    this.assertLineNoConflict(
      existed,
      {
        lineGroup: nextLineGroup,
        boundary: nextBoundary,
      },
      line.id,
    );

    line.lineGroup = nextLineGroup;
    line.boundary = nextBoundary;
    line.p1Time = nextP1Time;
    line.p2Time = nextP2Time;
    line.p1Price = nextP1Price;
    line.p2Price = nextP2Price;
    if (dto.remark !== undefined) {
      line.remark = this.normalizeRemark(dto.remark);
    }

    const updated = await this.strategyStructureLineRepository.save(line);
    return ResponseDto.success(updated);
  }

  async listLines(dto: QueryStrategyStructureLineDto, userId: number) {
    const symbol = this.normalizeOptionalText(dto.symbol, 'symbol');
    const timeframe = this.normalizeOptionalText(dto.timeframe, 'timeframe');

    const list = await this.strategyStructureLineRepository.find({
      where: {
        userId,
        ...(symbol ? { symbol } : {}),
        ...(timeframe ? { timeframe } : {}),
        ...(dto.lineGroup ? { lineGroup: dto.lineGroup } : {}),
      },
      order: {
        symbol: 'ASC',
        timeframe: 'ASC',
        lineGroup: 'ASC',
        boundary: 'ASC',
        id: 'ASC',
      },
    });
    return ResponseDto.success(list);
  }

  async deleteBatchLines(
    dto: DeleteBatchStrategyStructureLineDto,
    userId: number,
  ) {
    const lines = await this.strategyStructureLineRepository.find({
      where: {
        id: In(dto.ids),
        userId,
      },
      select: ['id'],
    });

    if (!lines.length) {
      return ResponseDto.success({
        deletedCount: 0,
        ids: [],
      });
    }

    const ownedIds = lines.map((item) => item.id);
    const result = await this.strategyStructureLineRepository.delete({
      id: In(ownedIds),
      userId,
    });

    return ResponseDto.success({
      deletedCount: result.affected || 0,
      ids: ownedIds,
    });
  }

  async setDirection(dto: SetStrategyMarketDirectionDto, userId: number) {
    const context = this.normalizeContext(userId, dto.symbol, dto.timeframe);
    const existed = await this.strategyMarketDirectionRepository.findOne({
      where: {
        userId: context.userId,
        symbol: context.symbol,
        timeframe: context.timeframe,
      },
    });

    if (existed) {
      existed.direction = dto.direction;
      existed.remark = this.normalizeRemark(dto.remark);
      const saved = await this.strategyMarketDirectionRepository.save(existed);
      return ResponseDto.success(saved);
    }

    const created = this.strategyMarketDirectionRepository.create({
      userId: context.userId,
      symbol: context.symbol,
      timeframe: context.timeframe,
      direction: dto.direction,
      remark: this.normalizeRemark(dto.remark),
    });
    const saved = await this.strategyMarketDirectionRepository.save(created);
    return ResponseDto.success(saved);
  }

  async getDirection(dto: QueryStrategyMarketDirectionDto, userId: number) {
    const context = this.normalizeContext(userId, dto.symbol, dto.timeframe);
    const direction = await this.strategyMarketDirectionRepository.findOne({
      where: {
        userId: context.userId,
        symbol: context.symbol,
        timeframe: context.timeframe,
      },
    });

    return ResponseDto.success(direction);
  }

  async listDirections(dto: QueryStrategyMarketDirectionListDto, userId: number) {
    const symbol = this.normalizeOptionalText(dto.symbol, 'symbol');
    const timeframe = this.normalizeOptionalText(dto.timeframe, 'timeframe');

    const list = await this.strategyMarketDirectionRepository.find({
      where: {
        userId,
        ...(symbol ? { symbol } : {}),
        ...(timeframe ? { timeframe } : {}),
        ...(dto.direction ? { direction: dto.direction } : {}),
      },
      order: {
        symbol: 'ASC',
        timeframe: 'ASC',
        id: 'ASC',
      },
    });

    return ResponseDto.success(list);
  }

  async deleteBatchDirections(
    dto: DeleteBatchStrategyMarketDirectionDto,
    userId: number,
  ) {
    const directions = await this.strategyMarketDirectionRepository.find({
      where: {
        id: In(dto.ids),
        userId,
      },
      select: ['id'],
    });

    if (!directions.length) {
      return ResponseDto.success({
        deletedCount: 0,
        ids: [],
      });
    }

    const ownedIds = directions.map((item) => item.id);
    const result = await this.strategyMarketDirectionRepository.delete({
      id: In(ownedIds),
      userId,
    });

    return ResponseDto.success({
      deletedCount: result.affected || 0,
      ids: ownedIds,
    });
  }

  private async getKeyLevelsByContext(args: {
    userId: number;
    symbol: string;
    timeframe: string;
  }) {
    return await this.strategyKeyLevelRepository.find({
      where: {
        userId: args.userId,
        symbol: args.symbol,
        timeframe: args.timeframe,
      },
      select: ['id', 'price', 'levelGroup', 'boundary'],
    });
  }

  private async getLinesByContext(args: {
    userId: number;
    symbol: string;
    timeframe: string;
  }) {
    return await this.strategyStructureLineRepository.find({
      where: {
        userId: args.userId,
        symbol: args.symbol,
        timeframe: args.timeframe,
      },
      select: ['id', 'lineGroup', 'boundary'],
    });
  }

  private assertKeyLevelNoConflict(
    existingList: Pick<StrategyKeyLevel, 'id' | 'price' | 'levelGroup' | 'boundary'>[],
    target: {
      price: number;
      levelGroup: StrategyLevelGroup;
      boundary: StrategyBoundary | null;
    },
    excludeId?: number,
  ) {
    const targetPrice = this.toPriceKey(target.price);
    for (const existed of existingList) {
      if (existed.id === excludeId) continue;

      if (this.toPriceKey(existed.price) === targetPrice) {
        throw new BadRequestException('同币种周期下存在相同价格的关键位');
      }

      if (
        target.levelGroup === 'RANGE' &&
        existed.levelGroup === 'RANGE' &&
        existed.boundary === target.boundary
      ) {
        throw new BadRequestException('同币种周期下震荡上沿或下沿只能存在一个');
      }
    }
  }

  private assertLineNoConflict(
    existingList: Pick<StrategyStructureLine, 'id' | 'lineGroup' | 'boundary'>[],
    target: {
      lineGroup: StrategyLineGroup;
      boundary: StrategyBoundary | null;
    },
    excludeId?: number,
  ) {
    if (target.lineGroup !== 'CHANNEL') return;

    for (const existed of existingList) {
      if (existed.id === excludeId) continue;

      if (
        existed.lineGroup === 'CHANNEL' &&
        existed.boundary === target.boundary
      ) {
        throw new BadRequestException('同币种周期下通道上沿或下沿只能存在一个');
      }
    }
  }

  private validatePrice(price: number, fieldName: string) {
    if (!Number.isFinite(price) || price <= 0) {
      throw new BadRequestException(`${fieldName} 必须大于 0`);
    }

    if (price > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException(
        `${fieldName} 不能大于 ${Number.MAX_SAFE_INTEGER}`,
      );
    }
  }

  private validateLineTimes(p1Time: number, p2Time: number) {
    this.validateTimestamp(p1Time, 'p1Time');
    this.validateTimestamp(p2Time, 'p2Time');
    if (p1Time === p2Time) {
      throw new BadRequestException('p1Time 与 p2Time 不能相同');
    }
  }

  private validateTimestamp(value: number, fieldName: string) {
    if (!Number.isInteger(value) || value <= 0) {
      throw new BadRequestException(`${fieldName} 必须是正整数时间戳`);
    }
    if (value > Number.MAX_SAFE_INTEGER) {
      throw new BadRequestException(
        `${fieldName} 不能大于 ${Number.MAX_SAFE_INTEGER}`,
      );
    }
  }

  private normalizeContext(userId: number, symbol: string, timeframe: string) {
    const normalizedSymbol = symbol.trim();
    const normalizedTimeframe = timeframe.trim();

    if (!normalizedSymbol) {
      throw new BadRequestException('symbol 不能为空');
    }

    if (!normalizedTimeframe) {
      throw new BadRequestException('timeframe 不能为空');
    }

    return {
      userId,
      symbol: normalizedSymbol,
      timeframe: normalizedTimeframe,
    };
  }

  private normalizeOptionalText(value: string | undefined, fieldName: string) {
    if (value === undefined) return undefined;

    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(`${fieldName} 不能为空字符串`);
    }

    return trimmed;
  }

  private resolveLevelBoundaryForCreate(
    levelGroup: StrategyLevelGroup,
    boundary?: StrategyBoundary,
  ) {
    if (levelGroup === 'NORMAL') {
      if (boundary !== undefined) {
        throw new BadRequestException(
          'levelGroup 为 NORMAL 时不允许传 boundary',
        );
      }
      return null;
    }

    if (!boundary) {
      throw new BadRequestException('levelGroup 为 RANGE 时必须传 boundary');
    }

    return boundary;
  }

  private resolveLevelBoundaryForUpdate(
    levelGroup: StrategyLevelGroup,
    inputBoundary: StrategyBoundary | undefined,
    currentBoundary: StrategyBoundary | null,
  ) {
    if (levelGroup === 'NORMAL') {
      if (inputBoundary !== undefined) {
        throw new BadRequestException(
          'levelGroup 为 NORMAL 时不允许传 boundary',
        );
      }
      return null;
    }

    if (inputBoundary !== undefined) {
      return inputBoundary;
    }

    if (!currentBoundary) {
      throw new BadRequestException('levelGroup 为 RANGE 时必须传 boundary');
    }

    return currentBoundary;
  }

  private resolveLineBoundaryForCreate(
    lineGroup: StrategyLineGroup,
    boundary?: StrategyBoundary,
  ) {
    if (lineGroup === 'TREND') {
      if (boundary !== undefined) {
        throw new BadRequestException(
          'lineGroup 为 TREND 时不允许传 boundary',
        );
      }
      return null;
    }

    if (!boundary) {
      throw new BadRequestException('lineGroup 为 CHANNEL 时必须传 boundary');
    }

    return boundary;
  }

  private resolveLineBoundaryForUpdate(
    lineGroup: StrategyLineGroup,
    inputBoundary: StrategyBoundary | undefined,
    currentBoundary: StrategyBoundary | null,
  ) {
    if (lineGroup === 'TREND') {
      if (inputBoundary !== undefined) {
        throw new BadRequestException(
          'lineGroup 为 TREND 时不允许传 boundary',
        );
      }
      return null;
    }

    if (inputBoundary !== undefined) {
      return inputBoundary;
    }

    if (!currentBoundary) {
      throw new BadRequestException('lineGroup 为 CHANNEL 时必须传 boundary');
    }

    return currentBoundary;
  }

  private normalizeRemark(remark?: string): string | null {
    if (remark === undefined) return null;

    const trimmed = remark.trim();
    if (!trimmed) return null;

    return trimmed;
  }

  private normalizeBatchItem(
    item: BatchCreateStrategyKeyLevelItemDto,
  ): BatchCreateStrategyKeyLevelItemDto & {
    boundary: StrategyBoundary | null;
    remark: string | null;
  } {
    return {
      ...item,
      boundary: this.resolveLevelBoundaryForCreate(item.levelGroup, item.boundary),
      remark: this.normalizeRemark(item.remark),
    };
  }

  private toRangeSlotKey(boundary: StrategyBoundary) {
    return `RANGE:${boundary}`;
  }

  private toPriceKey(price: number | string | null) {
    if (price === null) return '';
    return this.normalizePriceToScale8(price);
  }

  private normalizePriceToScale8(price: number | string) {
    const num = Number(price);
    return num.toFixed(8);
  }
}
