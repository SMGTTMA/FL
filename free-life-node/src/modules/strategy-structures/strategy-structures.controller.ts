import { Body, Controller, Post } from '@nestjs/common';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { User } from '@/modules/user/entities/user.entity';
import { BatchCreateStrategyKeyLevelDto } from './dto/batch-create-strategy-key-level.dto';
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
import { CreateStrategyStructureLineDto } from './dto/create-strategy-structure-line.dto';
import { UpdateStrategyStructureLineDto } from './dto/update-strategy-structure-line.dto';
import { StrategyStructuresService } from './strategy-structures.service';

@Controller('strategyStructures')
export class StrategyStructuresController {
  constructor(
    private readonly strategyStructuresService: StrategyStructuresService,
  ) {}

  @Post('create')
  async create(
    @Body() dto: CreateStrategyKeyLevelDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.create(dto, user.id);
  }

  @Post('createBatch')
  async createBatch(
    @Body() dto: BatchCreateStrategyKeyLevelDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.createBatch(dto, user.id);
  }

  @Post('update')
  async update(
    @Body() dto: UpdateStrategyKeyLevelDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.update(dto, user.id);
  }

  @Post('list')
  async list(
    @Body() dto: QueryStrategyKeyLevelDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.list(dto, user.id);
  }

  @Post('deleteBatch')
  async deleteBatch(
    @Body() dto: DeleteBatchStrategyKeyLevelDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.deleteBatch(dto, user.id);
  }

  @Post('createLine')
  async createLine(
    @Body() dto: CreateStrategyStructureLineDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.createLine(dto, user.id);
  }

  @Post('updateLine')
  async updateLine(
    @Body() dto: UpdateStrategyStructureLineDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.updateLine(dto, user.id);
  }

  @Post('listLines')
  async listLines(
    @Body() dto: QueryStrategyStructureLineDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.listLines(dto, user.id);
  }

  @Post('deleteBatchLines')
  async deleteBatchLines(
    @Body() dto: DeleteBatchStrategyStructureLineDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.deleteBatchLines(dto, user.id);
  }

  @Post('setDirection')
  async setDirection(
    @Body() dto: SetStrategyMarketDirectionDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.setDirection(dto, user.id);
  }

  @Post('getDirection')
  async getDirection(
    @Body() dto: QueryStrategyMarketDirectionDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.getDirection(dto, user.id);
  }

  @Post('listDirections')
  async listDirections(
    @Body() dto: QueryStrategyMarketDirectionListDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.listDirections(dto, user.id);
  }

  @Post('deleteBatchDirections')
  async deleteBatchDirections(
    @Body() dto: DeleteBatchStrategyMarketDirectionDto,
    @CurrentUser() user: User,
  ) {
    return await this.strategyStructuresService.deleteBatchDirections(
      dto,
      user.id,
    );
  }
}
