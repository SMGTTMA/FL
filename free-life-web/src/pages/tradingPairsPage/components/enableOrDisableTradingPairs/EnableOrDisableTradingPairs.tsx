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

export const EnableOrDisableTradingPairs = ({
  id,
  isActive,
  onSuccess,
}: Props) => {
  const { message } = App.useApp();

  const handleConfirm = async () => {
    try {
      if (isActive === 1) {
        await tradingPairsService.disable({ id });
        message.success("禁用成功");
      } else {
        await tradingPairsService.enable(id);
        message.success("启用成功");
      }
      onSuccess();
    } catch (error) {
      message.error("操作失败");
    }
  };

  return (
    <Popconfirm
      title={`确定要${isActive === 1 ? "禁用" : "启用"}该交易对吗？`}
      onConfirm={handleConfirm}
      okText="确定"
      cancelText="取消"
    >
      <Button type="link">{isActive === 1 ? "禁用" : "启用"}</Button>
    </Popconfirm>
  );
};
