import {
  disableStructureAlertRule,
  enableStructureAlertRule,
} from "@/api/services/structureAlertsService";
import { App, Button, Popconfirm } from "antd";
import { useState } from "react";

type ToggleStructureAlertRuleStatusProps = {
  ruleId: number;
  enabled: boolean;
  onSuccess?: () => void;
};

export const ToggleStructureAlertRuleStatus = ({
  ruleId,
  enabled,
  onSuccess,
}: ToggleStructureAlertRuleStatusProps) => {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      if (enabled) {
        await disableStructureAlertRule({ ruleId });
        message.success("规则已停用");
      } else {
        await enableStructureAlertRule({ ruleId });
        message.success("规则已启用");
      }
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Popconfirm
      title={enabled ? "确定要停用该规则吗？" : "确定要启用该规则吗？"}
      description={enabled ? "停用后将不再执行结构监控" : "启用后将开始执行结构监控"}
      onConfirm={handleConfirm}
      okText="确定"
      cancelText="取消"
      disabled={loading}
    >
      <Button type="link" loading={loading}>
        {enabled ? "停用" : "启用"}
      </Button>
    </Popconfirm>
  );
};

