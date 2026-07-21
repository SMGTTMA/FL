import { Select } from "antd";
import type { SelectProps } from "antd";

/**
 * 交易类型选择组件的属性类型
 * @extends SelectProps - 继承自 antd 的 Select 组件属性
 */
export type TradingTypeSelectProps = Omit<SelectProps, "options"> & {
  /** 是否禁用 */
  disabled?: boolean;
};

const options = [
  { label: "现货", value: "spot" },
  { label: "合约", value: "contract" },
];

/**
 * 交易类型选择组件
 * @description 支持现货和合约两种类型
 */
export const TradingTypeSelect = (props: TradingTypeSelectProps) => {
  const { disabled, ...restProps } = props;

  return (
    <Select
      placeholder="请选择交易类型"
      options={options}
      disabled={disabled}
      {...restProps}
    />
  );
};
