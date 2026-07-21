import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TradingPair } from './entities/trading-pair.entity';
import { CreateTradingPairDto } from './dto/create-trading-pair.dto';
import { QueryTradingPairDto } from './dto/query-trading-pair.dto';
import { ResponseDto } from '@/common/dto/response.dto';


@Injectable()
export class TradingPairsService {
  constructor(
    @InjectRepository(TradingPair)
    private readonly tradingPairRepository: Repository<TradingPair>,
  ) {}

  async create(dto: CreateTradingPairDto) {
    // 检查是否已存在相同的交易对
    const existingPair = await this.tradingPairRepository.findOne({
      where: {
        symbol: dto.symbol,
        type: dto.type,
        exchangeName: dto.exchangeName,
      },
    });

    if (existingPair) {
      throw new ConflictException(`交易对${dto.symbol}在${dto.exchangeName}键值对配置中已存在`);
    }

    const tradingPair = this.tradingPairRepository.create(dto);
    await this.tradingPairRepository.save(tradingPair);
    return ResponseDto.success(tradingPair);
  }

  async update(id: number, dto: CreateTradingPairDto) {
    // 先查出原始数据
    const origin = await this.tradingPairRepository.findOne({ where: { id } });
    if (!origin) {
      return ResponseDto.error('未找到该交易对');
    }

    // 需要校验唯一性时，取新值或原值
    const symbol = dto.symbol ?? origin.symbol;
    const type = dto.type ?? origin.type;
    const exchangeName = dto.exchangeName ?? origin.exchangeName;

    // 查找是否有其它记录拥有相同唯一索引组合
    const duplicate = await this.tradingPairRepository.findOne({
      where: {
        symbol,
        type,
        exchangeName,
      },
    });
    if (duplicate && duplicate.id !== id) {
      throw new ConflictException(`交易对${symbol}在${exchangeName}键值对配置中已存在`);
    }

    await this.tradingPairRepository.update(id, dto);
    return ResponseDto.success(await this.tradingPairRepository.findOne({ where: { id } }));
  }

  async delete(id: number) {
    await this.tradingPairRepository.delete(id);
    return ResponseDto.success({ id });
  }

  async disable(id: number) {
    await this.tradingPairRepository.update(id, { isActive: 0 });
    return ResponseDto.success(await this.tradingPairRepository.findOne({ where: { id } }));
  }

  async enable(id: number) {
    await this.tradingPairRepository.update(id, { isActive: 1 });
    return ResponseDto.success(await this.tradingPairRepository.findOne({ where: { id } }));
  }

  async findAll(query: QueryTradingPairDto) {
    return ResponseDto.success(await this.tradingPairRepository.find({ where: query }));
  }

  async findOne(id: number) {
    return ResponseDto.success(
      await this.tradingPairRepository.findOne({ where: { id } }),
    );
  }
}