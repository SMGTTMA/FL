import { Popconfirm, Button, App } from "antd";
import * as tradingPairsService from "@/api/services/tradingPairsService";

/**
 * 组件属性
 */
type Props = {
  /**
   * 交易对ID
   */
  id: number;
  /**
   * 交易对当前状态
   */
  isActive: number;
  /**
   * 成功后的回调
   */
  onSuccess: () => void;
};

export const DeleteTradingPairs = ({ id, isActive, onSuccess }: Props) => {
  const { message } = App.useApp();

  const handleConfirm = async () => {
    try {
      await tradingPairsService.remove(id);
      message.success("删除成功");
      onSuccess();
    } catch (error) {
      message.error("删除失败");
    }
  };

  return (
    <Popconfirm
      title="确定要删除该交易对吗？"
      description="删除后将无法恢复，请谨慎操作。"
      onConfirm={handleConfirm}
      okText="确定"
      cancelText="取消"
      disabled={isActive === 1}
    >
      <Button type="link" danger disabled={isActive === 1}>
        删除
      </Button>
    </Popconfirm>
  );
};
