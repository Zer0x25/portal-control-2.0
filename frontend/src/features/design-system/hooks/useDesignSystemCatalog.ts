import { useState } from "react";

export type CatalogSection = "tokens" | "components";

/** Estado y acciones de la página de catálogo del design system. */
export const useDesignSystemCatalog = () => {
  const [activeSection, setActiveSection] = useState<CatalogSection>("tokens");

  const handleSectionChange = (section: string) => {
    if (section === "tokens" || section === "components") setActiveSection(section);
  };

  return {
    activeSection,
    handleSectionChange,
  };
};

export type DesignSystemCatalogController = ReturnType<typeof useDesignSystemCatalog>;
