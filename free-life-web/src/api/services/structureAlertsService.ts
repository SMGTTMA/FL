import apiClient from "../apiClient";
import type {
  CreateStructureAlertRuleParams,
  DeleteStructureAlertRuleParams,
  QueryStructureAlertRuleParams,
  StructureAlertRuleItem,
  UpdateStructureAlertRuleStatusParams,
} from "../types/structureAlertsTypes";

export const createStructureAlertRule = (
  data: CreateStructureAlertRuleParams,
) =>
  apiClient.post<StructureAlertRuleItem>({
    url: "/structure-alerts/rule/create",
    data,
  });

export const listStructureAlertRules = (data: QueryStructureAlertRuleParams) =>
  apiClient.post<StructureAlertRuleItem[]>({
    url: "/structure-alerts/rule/list",
    data,
  });

export const enableStructureAlertRule = (
  data: UpdateStructureAlertRuleStatusParams,
) =>
  apiClient.post<StructureAlertRuleItem>({
    url: "/structure-alerts/rule/enable",
    data,
  });

export const disableStructureAlertRule = (
  data: UpdateStructureAlertRuleStatusParams,
) =>
  apiClient.post<StructureAlertRuleItem>({
    url: "/structure-alerts/rule/disable",
    data,
  });

export const deleteStructureAlertRule = (
  data: DeleteStructureAlertRuleParams,
) =>
  apiClient.post<string>({
    url: "/structure-alerts/rule/delete",
    data,
  });
