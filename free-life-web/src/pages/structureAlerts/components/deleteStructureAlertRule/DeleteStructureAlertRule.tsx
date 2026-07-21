import { deleteStructureAlertRule } from "@/api/services/structureAlertsService";
import { App, Button, Popconfirm } from "antd";
import { useState } from "react";

type DeleteStructureAlertRuleProps = {
  ruleId: number;
  onSuccess?: () => void;
};

export const DeleteStructureAlertRule = ({
  ruleId,
  onSuccess,
}: DeleteStructureAlertRuleProps) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await deleteStructureAlertRule({ ruleId });
      message.success(res || "规则已删除");
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title="确定要删除该规则吗？"
      description="删除后不可恢复"
      onConfirm={handleDelete}
      okText="确定"
      cancelText="取消"
      disabled={loading}
    >
      <Button type="link" danger loading={loading}>
        删除
      </Button>
    </Popconfirm>
  );
};
