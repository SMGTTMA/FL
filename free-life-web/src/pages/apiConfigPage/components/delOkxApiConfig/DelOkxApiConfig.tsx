import React from "react";
import { App, Popconfirm } from "antd";
import { deleteOKXApiConfig } from "@/api/services/apiConfig";

/**
 * DelOkxApiConfig 组件props类型
 * @property id 配置ID
 * @property refresh 刷新表格方法
 */
type DelOkxApiConfigProps = {
  id: number;
  refresh: () => void;
};

/**
 * OKX配置删除按钮，带二次确认
 * @default id: 0, refresh: 空函数
 */
export const DelOkxApiConfig: React.FC<DelOkxApiConfigProps> = ({
  id,
  refresh,
}) => {
  const { message } = App.useApp();

  const handleDelete = async () => {
    await deleteOKXApiConfig({ id });
    message.success("删除成功");
    refresh();
  };

  return (
    <Popconfirm
      title="确定要删除该配置吗？"
      onConfirm={handleDelete}
      okText="确定"
      cancelText="取消"
    >
      <a>删除</a>
    </Popconfirm>
  );
};
