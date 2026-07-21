import { BasePageDTO } from "#/entity";
import apiClient from "../apiClient";
import type {
  AiConversationItem,
  QueryAiConversationsParams,
} from "../types/aiConversationsTypes";

/** AI 对话 - 查询当前用户的对话记录 */
export const getMyAiConversations = (data: QueryAiConversationsParams) =>
  apiClient.post<BasePageDTO<AiConversationItem>>({
    url: "/ai-conversations/myConversations",
    data,
  });

/** AI 对话 - 查询指定策略的对话记录 */
export const getAiConversationsByStrategy = (
  data: QueryAiConversationsParams
) =>
  apiClient.post<BasePageDTO<AiConversationItem>>({
    url: "/ai-conversations/byStrategy",
    data,
  });

/** AI 对话 - 查询所有对话记录（管理员） */
export const getAllAiConversations = (data: QueryAiConversationsParams) =>
  apiClient.post<BasePageDTO<AiConversationItem>>({
    url: "/ai-conversations/list",
    data,
  });
