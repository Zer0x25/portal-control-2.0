import React from "react";
import RequestsTabView from "../views/RequestsTab.view";
import { useRequestsTabController } from "../hooks/useRequestsTabController";

const RequestsTabContainer: React.FC = () => {
  const controller = useRequestsTabController();
  return <RequestsTabView {...controller} />;
};

export default RequestsTabContainer;
