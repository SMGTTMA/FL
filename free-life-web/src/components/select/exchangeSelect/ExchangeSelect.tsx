import { Select } from "antd";
import type { SelectProps } from "antd";

/**
 * 交易所选择组件的属性类型
 * @extends SelectProps - 继承自 antd 的 Select 组件属性
 */
export type ExchangeSelectProps = Omit<SelectProps, "options"> & {
  /** 是否禁用 */
  disabled?: boolean;
};

const options = [{ label: "OKX", value: "OKX" }];

/**
 * 交易所选择组件
 * @description 目前仅支持 OKX
 */
export const ExchangeSelect = (props: ExchangeSelectProps) => {
  const { disabled, ...restProps } = props;

  return (
    <Select
      placeholder="请选择交易所"
      options={options}
      disabled={disabled}
      {...restProps}
    />
  );
};
