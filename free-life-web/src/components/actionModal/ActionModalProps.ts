import { ButtonProps, ModalProps } from "antd";

export type ActionModalProps = {
  buttonProps?: Omit<Partial<ButtonProps>, "children"> & {
    title: React.ReactNode;
  };
  modalProps?: Omit<ModalProps, "open" | "children" | "onOk"> & {
    onOk?: (close: () => void) => void;
  };
} & Pick<ModalProps, "children">;
