import { useId, useState } from "react";
import { useToasts } from "../../../hooks/useToasts";

export type CatalogSection = "tokens" | "components" | "cards" | "feedback";

/** Estado y acciones de la página de catálogo del design system. */
export const useDesignSystemCatalog = () => {
  const { addToast } = useToasts();
  const [activeSection, setActiveSection] = useState<CatalogSection>("tokens");
  const [isTestConfirmOpen, setIsTestConfirmOpen] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const [selectValue, setSelectValue] = useState("chile");
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [textareaValue, setTextareaValue] = useState("");

  const inputId = useId();
  const selectId = useId();
  const textareaId = useId();

  const handleSectionChange = (section: string) => {
    setActiveSection(section as CatalogSection);
  };

  return {
    addToast,
    activeSection,
    handleSectionChange,
    isTestConfirmOpen,
    setIsTestConfirmOpen,
    inputValue,
    setInputValue,
    inputError,
    setInputError,
    selectValue,
    setSelectValue,
    checkboxChecked,
    setCheckboxChecked,
    switchChecked,
    setSwitchChecked,
    textareaValue,
    setTextareaValue,
    inputId,
    selectId,
    textareaId,
  };
};

export type DesignSystemCatalogController = ReturnType<typeof useDesignSystemCatalog>;
