import { Button, Modal } from "antd";
import type { ActionModalProps } from "./ActionModalProps";
import { useState } from "react";

export const ActionModal = (props: ActionModalProps) => {
  const { buttonProps, modalProps, children } = props;
  const {
    onCancel: onCancelModal,
    onOk: onOkModal,
    ...rest
  } = modalProps || {};
  const { title, onClick, ...restButtonProps } = buttonProps || {};

  const [open, setOpen] = useState(false);

  const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(true);
    onClick?.(e);
  };

  const handleCancel = (e: React.MouseEvent<HTMLButtonElement>) => {
    setOpen(false);
    onCancelModal?.(e);
  };

  const handleOk = () => {
    onOkModal?.(() => setOpen(false));
  };

  return (
    <>
      <Button type="link" {...restButtonProps} onClick={handleOpen}>
        {title}
      </Button>
      <Modal {...rest} open={open} onOk={handleOk} onCancel={handleCancel}>
        {children}
      </Modal>
    </>
  );
};
