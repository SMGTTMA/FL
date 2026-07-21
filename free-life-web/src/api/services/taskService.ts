import apiClient from "../apiClient";

/**
 * 获取任务状态
 * @param taskId 任务ID
 * @returns 任务状态信息
 */
const getTaskStatus = (taskId: string) =>
  apiClient.post({ url: "/v1/task/status", data: { task_id: taskId } });

export { getTaskStatus };
