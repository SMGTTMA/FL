import type { ColumnsType } from "antd/es/table";
import { AddOrEditTradingPairs } from "./components/addOrEditTradingPairs/AddOrEditTradingPairs";
import type { TradingPair } from "@/api/types/tradingPairsTypes";
import { EnableOrDisableTradingPairs } from "./components/enableOrDisableTradingPairs/EnableOrDisableTradingPairs";
import { Space } from "antd";
import { DeleteTradingPairs } from "./components/deleteTradingPairs/DeleteTradingPairs";

export const renderColumns = (
  onSuccess: () => void
): ColumnsType<TradingPair> => {
  return [
    {
      title: "交易对",
      dataIndex: "symbol",
      key: "symbol",
    },
    {
      title: "基础资产",
      dataIndex: "baseAsset",
      key: "baseAsset",
    },
    {
      title: "计价资产",
      dataIndex: "quoteAsset",
      key: "quoteAsset",
    },
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "交易所",
      dataIndex: "exchangeName",
      key: "exchangeName",
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      render: (isActive: number) => (isActive === 1 ? "启用" : "禁用"),
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      render: (_, record) => (
        <Space>
          <AddOrEditTradingPairs
            operation="edit"
            id={record.id}
            onSuccess={onSuccess}
          />
          <EnableOrDisableTradingPairs
            id={record.id}
            isActive={record.isActive}
            onSuccess={onSuccess}
          />
          <DeleteTradingPairs
            id={record.id}
            isActive={record.isActive}
            onSuccess={onSuccess}
          />
        </Space>
      ),
    },
  ];
};
