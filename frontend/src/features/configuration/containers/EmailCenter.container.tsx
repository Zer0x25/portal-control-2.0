import React from "react";
import { useEmailCenterController } from "../hooks/useEmailCenterController";
import { EmailCenterView } from "../views/EmailCenter.view";

const EmailCenterContainer: React.FC = () => {
  const logic = useEmailCenterController();
  return <EmailCenterView {...logic} />;
};

export default EmailCenterContainer;
