import React from "react";
import { useToasts } from "../../hooks/useToasts";
import ToastContainerView from "./ToastContainer.view";

const ToastContainerContainer: React.FC = () => {
  const { toasts, removeToast } = useToasts();

  return <ToastContainerView toasts={toasts} onDismiss={removeToast} />;
};

export default ToastContainerContainer;
