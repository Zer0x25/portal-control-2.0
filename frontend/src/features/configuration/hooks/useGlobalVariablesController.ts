import { useEffect, useState } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { useEmployees } from "../../../hooks/useEmployees";
import { useAuth } from "../../../hooks/useAuth";
import { configService } from "../../../services/configService";
import {
  useGlobalMaxWeeklyHoursQuery,
  useAreaListQuery,
  useWorkdayTypeListQuery,
  useEmailRecipientsListQuery,
  useControlInternoEnabledQuery,
  useBrandLogoQuery,
} from "../../../hooks/queries/useConfigQuery";
import { useConfigMutations } from "../../../hooks/useConfigMutations";
import type { BrandLogo as BrandLogoValue } from "../../../services/configService";

export const useGlobalVariablesController = () => {
  const { data: globalMaxWeeklyHours = 44, isLoading: isMaxHoursLoading } =
    useGlobalMaxWeeklyHoursQuery();

  const { data: areaListArr = [], isLoading: isAreasLoading } = useAreaListQuery();

  const { data: workdayTypeListArr = [], isLoading: isWorkdayTypesLoading } =
    useWorkdayTypeListQuery();

  const { data: emailRecipientsListArr = [], isLoading: isEmailsLoading } =
    useEmailRecipientsListQuery();

  const { data: isControlInternoEnabled = true, isLoading: isControlInternoLoading } =
    useControlInternoEnabledQuery();

  const { data: brandLogo, refetch: refetchBrandLogo } = useBrandLogoQuery();

  const { updateConfig } = useConfigMutations();

  const { employees } = useEmployees();

  const { currentUser } = useAuth();

  const { addToast } = useToasts();

  const areaList = areaListArr || [];

  const workdayTypeList = workdayTypeListArr || [];

  const emailRecipientsList = emailRecipientsListArr || [];

  const isLoading =
    isMaxHoursLoading ||
    isAreasLoading ||
    isWorkdayTypesLoading ||
    isEmailsLoading ||
    isControlInternoLoading;

  const [maxWeeklyHoursInputValue, setMaxWeeklyHoursInputValue] = useState<string>("");

  const [newAreaName, setNewAreaName] = useState("");

  const [areaToDelete, setAreaToDelete] = useState<string | null>(null);

  const [newWorkdayTypeName, setNewWorkdayTypeName] = useState("");

  const [workdayTypeToDelete, setWorkdayTypeToDelete] = useState<string | null>(null);

  const [newEmailRecipient, setNewEmailRecipient] = useState("");

  const [emailRecipientToDelete, setEmailRecipientToDelete] = useState<string | null>(null);

  const [policyFile, setPolicyFile] = useState<File | null>(null);

  const [policyMeta, setPolicyMeta] = useState<{
    url: string;
    originalName: string;
    size: number;
    uploadedAt: string;
    uploadedBy: string;
  } | null>(null);

  const [isUploadingPolicy, setIsUploadingPolicy] = useState(false);

  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [logoUrlInput, setLogoUrlInput] = useState("");

  const [logoWidthInput, setLogoWidthInput] = useState("512");

  const [logoHeightInput, setLogoHeightInput] = useState("188");

  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const [isSavingLogo, setIsSavingLogo] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setMaxWeeklyHoursInputValue(String(globalMaxWeeklyHours));
    }
  }, [globalMaxWeeklyHours, isLoading]);

  useEffect(() => {
    configService
      .getPublicCompanyPolicy()
      .then((meta) => setPolicyMeta(meta))
      .catch(() => undefined);
  }, []);

  const handleUploadPolicy = async () => {
    if (!policyFile) {
      addToast("Selecciona un PDF antes de subirlo.", "warning");
      return;
    }

    if (policyFile.type !== "application/pdf") {
      addToast("Solo se permiten archivos PDF.", "error");
      return;
    }

    try {
      setIsUploadingPolicy(true);
      const result = await configService.uploadCompanyPolicy(policyFile);
      setPolicyMeta(result);
      setPolicyFile(null);
      addToast("Reglamento actualizado correctamente.", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo actualizar el reglamento";
      addToast(message, "error");
    } finally {
      setIsUploadingPolicy(false);
    }
  };

  const parseLogoSize = (): { width: number; height: number } | null => {
    const width = Number.parseInt(logoWidthInput, 10);
    const height = Number.parseInt(logoHeightInput, 10);
    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 16 ||
      height < 16 ||
      width > 512 ||
      height > 512
    ) {
      addToast("El ancho y alto deben ser enteros entre 16 y 512 píxeles.", "error");
      return null;
    }
    return { width, height };
  };

  const handleUploadLogo = async () => {
    if (!logoFile) {
      addToast("Selecciona una imagen antes de subirla.", "warning");
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp"].includes(logoFile.type)) {
      addToast("Solo se permiten imágenes PNG, JPG o WebP.", "error");
      return;
    }
    try {
      setIsUploadingLogo(true);
      await configService.uploadBrandLogo(logoFile);
      setLogoFile(null);
      await refetchBrandLogo();
      addToast("Logo actualizado correctamente.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No se pudo actualizar el logo", "error");
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSaveLogoUrl = async () => {
    const size = parseLogoSize();
    if (!size) return;
    const ref = logoUrlInput.trim();
    if (!ref.startsWith("https://")) {
      addToast("La URL del logo debe usar HTTPS.", "error");
      return;
    }
    try {
      setIsSavingLogo(true);
      const value: BrandLogoValue = { source: { kind: "url", ref }, ...size };
      await updateConfig({ key: "branding_logo", value });
      setLogoUrlInput("");
      await refetchBrandLogo();
    } catch {
      // updateConfig ya muestra el toast de error.
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleSaveLogoSize = async () => {
    const size = parseLogoSize();
    if (!size || !brandLogo) return;
    try {
      setIsSavingLogo(true);
      const value: BrandLogoValue = { source: brandLogo.source, ...size };
      await updateConfig({ key: "branding_logo", value });
      await refetchBrandLogo();
    } catch {
      // updateConfig ya muestra el toast de error.
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleResetLogo = async () => {
    try {
      setIsSavingLogo(true);
      await updateConfig({ key: "branding_logo", value: null });
      await refetchBrandLogo();
    } catch {
      // updateConfig ya muestra el toast de error.
    } finally {
      setIsSavingLogo(false);
    }
  };

  const handleSaveGlobalMaxHours = async () => {
    const newMaxHours = parseInt(maxWeeklyHoursInputValue, 10);
    if (isNaN(newMaxHours) || newMaxHours <= 0 || newMaxHours > 168) {
      addToast("Por favor, ingrese un número válido de horas (ej. 1-168).", "error");
      return;
    }
    await updateConfig({ key: "global_max_hours", value: newMaxHours });
  };

  const handleAddArea = async () => {
    const trimmedArea = newAreaName.trim();
    if (!trimmedArea) {
      addToast("El nombre del área no puede estar vacío.", "warning");
      return;
    }
    if (areaList.some((area: string) => area.toLowerCase() === trimmedArea.toLowerCase())) {
      addToast("El área ya existe.", "warning");
      return;
    }
    const newList = [...areaList, trimmedArea];
    await updateConfig({ key: "area_list", value: newList });
    setNewAreaName("");
  };

  const handleDeleteArea = (area: string) => {
    const isUsed = employees.some((emp) => emp.area === area);
    if (isUsed) {
      addToast("No se puede eliminar. El área está en uso por uno o más empleados.", "error");
      return;
    }
    setAreaToDelete(area);
  };

  const handleConfirmDeleteArea = async () => {
    if (!areaToDelete) return;
    const newList = areaList.filter((area: string) => area !== areaToDelete);
    await updateConfig({ key: "area_list", value: newList });
    setAreaToDelete(null);
  };

  const handleAddWorkdayType = async () => {
    const trimmedType = newWorkdayTypeName.trim();
    if (!trimmedType) {
      addToast("El tipo de jornada no puede estar vacío.", "warning");
      return;
    }
    if (workdayTypeList.some((type: string) => type.toLowerCase() === trimmedType.toLowerCase())) {
      addToast("El tipo de jornada ya existe.", "warning");
      return;
    }
    const newList = [...workdayTypeList, trimmedType];
    await updateConfig({ key: "workday_types", value: newList });
    setNewWorkdayTypeName("");
  };

  const handleDeleteWorkdayType = (type: string) => {
    const isUsed = employees.some((emp) => emp.workdayType === type);
    if (isUsed) {
      addToast(
        "No se puede eliminar. El tipo de jornada está en uso por uno o más empleados.",
        "error",
      );
      return;
    }
    setWorkdayTypeToDelete(type);
  };

  const handleConfirmDeleteWorkdayType = async () => {
    if (!workdayTypeToDelete) return;
    const newList = workdayTypeList.filter((type: string) => type !== workdayTypeToDelete);
    await updateConfig({ key: "workday_types", value: newList });
    setWorkdayTypeToDelete(null);
  };

  const handleAddEmailRecipient = async () => {
    const trimmedEmail = newEmailRecipient.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      addToast("El correo no puede estar vacío.", "warning");
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      addToast("Por favor, ingrese un formato de correo válido.", "error");
      return;
    }
    if (
      emailRecipientsList.some(
        (email: string) => email.toLowerCase() === trimmedEmail.toLowerCase(),
      )
    ) {
      addToast("Este correo electrónico ya está en la lista.", "warning");
      return;
    }
    const newList = [...emailRecipientsList, trimmedEmail];
    await updateConfig({ key: "email_recipients", value: newList });
    setNewEmailRecipient("");
  };

  const handleDeleteEmailRecipient = (email: string) => {
    setEmailRecipientToDelete(email);
  };

  const handleConfirmDeleteEmailRecipient = async () => {
    if (!emailRecipientToDelete) return;
    const newList = emailRecipientsList.filter((email: string) => email !== emailRecipientToDelete);
    await updateConfig({ key: "email_recipients", value: newList });
    setEmailRecipientToDelete(null);
  };

  const logoPreviewSrc = !brandLogo
    ? null
    : brandLogo.source.kind === "upload"
      ? (brandLogo.url ?? null)
      : brandLogo.source.ref;

  return {
    globalMaxWeeklyHours,
    isMaxHoursLoading,
    areaListArr,
    isAreasLoading,
    workdayTypeListArr,
    isWorkdayTypesLoading,
    emailRecipientsListArr,
    isEmailsLoading,
    isControlInternoEnabled,
    isControlInternoLoading,
    brandLogo,
    refetchBrandLogo,
    updateConfig,
    employees,
    currentUser,
    addToast,
    areaList,
    workdayTypeList,
    emailRecipientsList,
    isLoading,
    maxWeeklyHoursInputValue,
    setMaxWeeklyHoursInputValue,
    newAreaName,
    setNewAreaName,
    areaToDelete,
    setAreaToDelete,
    newWorkdayTypeName,
    setNewWorkdayTypeName,
    workdayTypeToDelete,
    setWorkdayTypeToDelete,
    newEmailRecipient,
    setNewEmailRecipient,
    emailRecipientToDelete,
    setEmailRecipientToDelete,
    policyFile,
    setPolicyFile,
    policyMeta,
    setPolicyMeta,
    isUploadingPolicy,
    setIsUploadingPolicy,
    logoFile,
    setLogoFile,
    logoUrlInput,
    setLogoUrlInput,
    logoWidthInput,
    setLogoWidthInput,
    logoHeightInput,
    setLogoHeightInput,
    isUploadingLogo,
    setIsUploadingLogo,
    isSavingLogo,
    setIsSavingLogo,
    handleUploadPolicy,
    parseLogoSize,
    handleUploadLogo,
    handleSaveLogoUrl,
    handleSaveLogoSize,
    handleResetLogo,
    handleSaveGlobalMaxHours,
    handleAddArea,
    handleDeleteArea,
    handleConfirmDeleteArea,
    handleAddWorkdayType,
    handleDeleteWorkdayType,
    handleConfirmDeleteWorkdayType,
    handleAddEmailRecipient,
    handleDeleteEmailRecipient,
    handleConfirmDeleteEmailRecipient,
    logoPreviewSrc,
  };
};

export type GlobalVariablesManagerController = ReturnType<typeof useGlobalVariablesController>;
