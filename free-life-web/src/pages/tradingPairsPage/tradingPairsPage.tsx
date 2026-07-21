import { Button, Flex, Table } from "antd";
import { useRequest } from "ahooks";
import { findAll } from "@/api/services/tradingPairsService";
import { renderColumns } from "./columns";
import { AddOrEditTradingPairs } from "./components/addOrEditTradingPairs/AddOrEditTradingPairs";

const TradingPairsPage = () => {
  const { data: tradingPairsList, loading, refresh } = useRequest(findAll, {});

  return (
    <div className="p-2">
      <Flex className="mb-2" align="center" gap="middle">
        <AddOrEditTradingPairs operation="add" onSuccess={refresh} />
        <Button loading={loading} onClick={refresh}>
          刷新
        </Button>
      </Flex>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={tradingPairsList}
        columns={renderColumns(refresh)}
        pagination={false}
      />
    </div>
  );
};

export default TradingPairsPage;
