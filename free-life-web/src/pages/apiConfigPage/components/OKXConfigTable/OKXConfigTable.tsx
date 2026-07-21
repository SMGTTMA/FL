import { Button, Card, Space, Table } from "antd";
import { renderColumns } from "./columns";
import { OKXApiAddModal } from "../OKXApiAddModal/OKXApiAddModal";
import { useRequest } from "ahooks";
import { getOKXApiConfig } from "@/api/services/apiConfig";

export const OKXConfigTable = () => {
  const {
    data: okxApiConfigList,
    loading,
    refresh,
  } = useRequest(getOKXApiConfig, {});

  return (
    <Card title="OKX API管理">
      <Space className="mb-2">
        <OKXApiAddModal refresh={refresh} />
        <Button loading={loading} onClick={refresh}>
          刷新
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        dataSource={okxApiConfigList}
        columns={renderColumns({ refresh })}
        pagination={false}
      />
    </Card>
  );
};
