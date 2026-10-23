import React from "react";
import { useDesignSystemCatalog } from "../hooks/useDesignSystemCatalog";
import DesignSystemCatalogView from "../views/DesignSystemCatalog.view";

const DesignSystemCatalogContainer: React.FC = () => {
  const controller = useDesignSystemCatalog();

  return <DesignSystemCatalogView {...controller} />;
};

export default DesignSystemCatalogContainer;
