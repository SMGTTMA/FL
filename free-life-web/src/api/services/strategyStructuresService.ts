import apiClient from "../apiClient";
import type {
  CreateStrategyKeyLevelParams,
  CreateStrategyStructureLineParams,
  DeleteBatchStrategyKeyLevelParams,
  DeleteBatchStrategyStructureLineParams,
  QueryStrategyDirectionParams,
  QueryStrategyDirectionListParams,
  QueryStrategyKeyLevelParams,
  QueryStrategyStructureLineParams,
  SetStrategyDirectionParams,
  StrategyDirectionItem,
  StrategyKeyLevelItem,
  StrategyStructureLineItem,
  UpdateStrategyKeyLevelParams,
  UpdateStrategyStructureLineParams,
} from "../types/strategyStructuresTypes";

export const createStrategyKeyLevel = (data: CreateStrategyKeyLevelParams) =>
  apiClient.post<StrategyKeyLevelItem>({
    url: "/strategyStructures/create",
    data,
  });

export const updateStrategyKeyLevel = (data: UpdateStrategyKeyLevelParams) =>
  apiClient.post<StrategyKeyLevelItem>({
    url: "/strategyStructures/update",
    data,
  });

export const listStrategyKeyLevels = (data: QueryStrategyKeyLevelParams) =>
  apiClient.post<StrategyKeyLevelItem[]>({
    url: "/strategyStructures/list",
    data,
  });

export const deleteBatchStrategyKeyLevels = (
  data: DeleteBatchStrategyKeyLevelParams
) =>
  apiClient.post<{ deletedCount: number; ids: number[] }>({
    url: "/strategyStructures/deleteBatch",
    data,
  });

export const createStrategyStructureLine = (
  data: CreateStrategyStructureLineParams
) =>
  apiClient.post<StrategyStructureLineItem>({
    url: "/strategyStructures/createLine",
    data,
  });

export const updateStrategyStructureLine = (
  data: UpdateStrategyStructureLineParams
) =>
  apiClient.post<StrategyStructureLineItem>({
    url: "/strategyStructures/updateLine",
    data,
  });

export const listStrategyStructureLines = (
  data: QueryStrategyStructureLineParams
) =>
  apiClient.post<StrategyStructureLineItem[]>({
    url: "/strategyStructures/listLines",
    data,
  });

export const deleteBatchStrategyStructureLines = (
  data: DeleteBatchStrategyStructureLineParams
) =>
  apiClient.post<{ deletedCount: number; ids: number[] }>({
    url: "/strategyStructures/deleteBatchLines",
    data,
  });

export const setStrategyDirection = (data: SetStrategyDirectionParams) =>
  apiClient.post<StrategyDirectionItem>({
    url: "/strategyStructures/setDirection",
    data,
  });

export const getStrategyDirection = (data: QueryStrategyDirectionParams) =>
  apiClient.post<StrategyDirectionItem | null>({
    url: "/strategyStructures/getDirection",
    data,
  });

export const listStrategyDirections = (data: QueryStrategyDirectionListParams) =>
  apiClient.post<StrategyDirectionItem[]>({
    url: "/strategyStructures/listDirections",
    data,
  });
