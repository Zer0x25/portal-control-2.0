import React, { useState, useEffect } from "react";
import { useToasts } from "../../../hooks/useToasts";
import { useEmployees } from "../../../hooks/useEmployees";
import { useAuth } from "../../../hooks/useAuth";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Switch from "../../../components/ui/Switch";
import Badge from "../../../components/ui/Badge";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import {
  PlusCircleIcon,
  DeleteIcon,
  EnvelopeIcon,
  DocumentArrowUpIcon,
  DocumentTextIcon,
} from "../../../components/ui/icons/index";
import Card from "../../../components/ui/Card";
import { configService } from "../../../services/configService";

import {
  useGlobalMaxWeeklyHoursQuery,
  useAreaListQuery,
  useWorkdayTypeListQuery,
  useEmailRecipientsListQuery,
  useControlInternoEnabledQuery,
} from "../../../hooks/queries/useConfigQuery";
import { useConfigMutations } from "../../../hooks/useConfigMutations";

export const GlobalVariablesManager: React.FC = () => {
  const { data: globalMaxWeeklyHours = 44, isLoading: isMaxHoursLoading } =
    useGlobalMaxWeeklyHoursQuery();
  const { data: areaListArr = [], isLoading: isAreasLoading } = useAreaListQuery();
  const { data: workdayTypeListArr = [], isLoading: isWorkdayTypesLoading } =
    useWorkdayTypeListQuery();
  const { data: emailRecipientsListArr = [], isLoading: isEmailsLoading } =
    useEmailRecipientsListQuery();
  const { data: isControlInternoEnabled = true, isLoading: isControlInternoLoading } =
    useControlInternoEnabledQuery();
  const { updateConfig } = useConfigMutations();
  const { employees } = useEmployees();
  const { currentUser } = useAuth();
  const { addToast } = useToasts();

  // Normalize data as arrays since queries might return null if not set
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

  return (
    <div className="space-y-8 pb-20">
      <Card
        className="overflow-hidden border border-token-border-technical shadow-sm bg-token-surface-card rounded-md group/mainCard"
        noPadding
      >
        <div className="px-8 py-8 bg-token-surface-stripe border-b border-token-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-black text-token-text-primary uppercase tracking-tight leading-none">
              Panel de Parámetros Globales
            </h3>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-sap-blue mt-2">
              AJUSTES MAESTROS DE LÓGICA OPERATIVA
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge
              variant="success"
              showDot
              className="rounded-md px-3 py-1 font-black uppercase tracking-widest text-[10px]"
            >
              MOTOR ACTIVO
            </Badge>
          </div>
        </div>

        <div className="p-10 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Horas Semanales */}
          {/* Horas Semanales */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-sap-blue rounded-sm"></div>
              <div>
                <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                  Jornada Laboral
                </h4>
                <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                  LÍMITES LEGALES Y NORMATIVOS
                </p>
              </div>
            </div>
            <div className="bg-token-surface-card p-6 rounded-md border border-token-border-technical shadow-sm space-y-6">
              <Input
                label="MÁXIMO SEMANAL PERMITIDO"
                id="globalMaxWeeklyHours"
                type="number"
                value={maxWeeklyHoursInputValue}
                onChange={(e) => setMaxWeeklyHoursInputValue(e.target.value)}
                min="1"
                max="168"
                className="font-black text-sm uppercase tracking-tight"
              />
              <Button
                onClick={handleSaveGlobalMaxHours}
                className="w-full h-11 rounded-md bg-sap-blue text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-sap-blue/20 hover:shadow-sap-blue/30"
              >
                ACTUALIZAR LÓGICA DE JORNADA
              </Button>
            </div>
          </section>

          {/* Áreas */}
          {/* Áreas */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-emerald-500 rounded-sm"></div>
              <div>
                <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                  Departamentos
                </h4>
                <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                  ESTRUCTURA ORGANIZACIONAL
                </p>
              </div>
            </div>
            <div className="bg-token-surface-card p-6 rounded-md border border-token-border-technical shadow-sm space-y-6">
              <div className="flex items-end gap-3 flex-col sm:flex-row">
                <div className="flex-1 w-full">
                  <Input
                    label="NUEVO DEPTO/ÁREA"
                    id="newAreaName"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="Ej Logística"
                    className="font-black text-xs uppercase tracking-tight"
                  />
                </div>
                <Button
                  onClick={handleAddArea}
                  className="w-full sm:w-14 h-11 rounded-md flex items-center justify-center bg-sap-blue text-white shadow-lg shadow-sap-blue/20 p-0 shrink-0"
                >
                  <PlusCircleIcon className="w-6 h-6" />
                </Button>
              </div>
              <div className="mt-4 bg-token-surface-stripe rounded-md border border-token-border-subtle max-h-64 overflow-y-auto no-scrollbar shadow-inner">
                {areaList.length > 0 ? (
                  <ul className="divide-y divide-token-border-subtle">
                    {areaList.map((area: string) => (
                      <li
                        key={area}
                        className="flex justify-between items-center px-6 py-4 text-sm group/item hover:bg-token-surface-active transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 group-hover/item:bg-emerald-500 transition-colors" />
                          <span className="text-[11px] font-black uppercase text-token-text-secondary tracking-tight">
                            {area}
                          </span>
                        </div>
                        {area !== "Otros" && (
                          <button
                            className="p-2 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 border border-rose-500/20"
                            onClick={() => handleDeleteArea(area)}
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-token-text-tertiary">
                      SIN DEPARTAMENTOS REGISTRADOS
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Tipos de Jornada */}
          {/* Tipos de Jornada */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-indigo-500 rounded-sm"></div>
              <div>
                <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                  Protocolos de Jornada
                </h4>
                <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                  CONFIGURACIÓN DE CONTRATOS
                </p>
              </div>
            </div>
            <div className="bg-token-surface-card p-6 rounded-md border border-token-border-technical shadow-sm space-y-6">
              <div className="flex items-end gap-3 flex-col sm:flex-row">
                <div className="flex-1 w-full">
                  <Input
                    label="NUEVO PROCOLO/TIPO"
                    id="newWorkdayTypeName"
                    value={newWorkdayTypeName}
                    onChange={(e) => setNewWorkdayTypeName(e.target.value)}
                    placeholder="Ej Full-Time"
                    className="font-black text-xs uppercase tracking-tight"
                  />
                </div>
                <Button
                  onClick={handleAddWorkdayType}
                  className="w-full sm:w-14 h-11 rounded-md flex items-center justify-center bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 p-0 shrink-0"
                >
                  <PlusCircleIcon className="w-6 h-6" />
                </Button>
              </div>
              <div className="mt-4 bg-token-surface-stripe rounded-md border border-token-border-subtle max-h-64 overflow-y-auto no-scrollbar shadow-inner">
                {workdayTypeList.length > 0 ? (
                  <ul className="divide-y divide-token-border-subtle">
                    {workdayTypeList.map((type: string) => (
                      <li
                        key={type}
                        className="flex justify-between items-center px-6 py-4 text-sm group/item hover:bg-token-surface-active transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40 group-hover/item:bg-indigo-500 transition-colors" />
                          <span className="text-[11px] font-black uppercase text-token-text-secondary tracking-tight">
                            {type}
                          </span>
                        </div>
                        {!["Artículo 22", "Full-Time", "Part-Time"].includes(type) && (
                          <button
                            className="p-2 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 border border-rose-500/20"
                            onClick={() => handleDeleteWorkdayType(type)}
                          >
                            <DeleteIcon className="w-4 h-4" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-token-text-tertiary">
                      SIN PROTOCOLOS REGISTRADOS
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Correos */}
          {/* Correos */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-rose-500 rounded-sm"></div>
              <div>
                <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                  Central de Alertas Email
                </h4>
                <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                  SUSCRIPCIÓN A REPORTES AUTOMÁTICOS
                </p>
              </div>
            </div>
            <div className="bg-token-surface-card p-6 rounded-md border border-token-border-technical shadow-sm space-y-6">
              <div className="flex items-end gap-3 flex-col sm:flex-row">
                <div className="flex-1 w-full">
                  <Input
                    label="REGISTRAR NUEVO RECEPTOR"
                    id="newEmailRecipient"
                    type="email"
                    value={newEmailRecipient}
                    onChange={(e) => setNewEmailRecipient(e.target.value)}
                    placeholder="ejemplo@corporativo.cl"
                    className="font-black text-xs lowercase tracking-tight"
                  />
                </div>
                <Button
                  onClick={handleAddEmailRecipient}
                  className="w-full sm:w-14 h-11 rounded-md flex items-center justify-center bg-rose-500 text-white shadow-lg shadow-rose-500/20 p-0 shrink-0"
                >
                  <EnvelopeIcon className="w-5 h-5" />
                </Button>
              </div>
              <div className="mt-4 bg-token-surface-stripe rounded-md border border-token-border-subtle max-h-64 overflow-y-auto no-scrollbar shadow-inner">
                {emailRecipientsList.length > 0 ? (
                  <ul className="divide-y divide-token-border-subtle">
                    {emailRecipientsList.map((email: string) => (
                      <li
                        key={email}
                        className="flex justify-between items-center px-6 py-4 text-sm group/item hover:bg-token-surface-active transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-md bg-rose-500/10 flex items-center justify-center border border-rose-500/20 transition-transform group-hover/item:scale-110">
                            <EnvelopeIcon className="w-4 h-4 text-rose-600" />
                          </div>
                          <span className="text-[11px] font-black lowercase text-token-text-secondary tracking-tight">
                            {email}
                          </span>
                        </div>
                        <button
                          className="p-2 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 border border-rose-500/20"
                          onClick={() => handleDeleteEmailRecipient(email)}
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-token-text-tertiary">
                      LISTA DE DIFUSIÓN VACÍA
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Modularidad (Control Interno) */}
          {/* Modularidad (Control Interno) */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-6 bg-amber-500 rounded-sm"></div>
              <div>
                <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                  Modularidad
                </h4>
                <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                  ACTIVAR/DESACTIVAR FUNCIONES EXTENDIDAS
                </p>
              </div>
            </div>
            <div
              className={`bg-token-surface-card p-6 rounded-md border ${isControlInternoEnabled ? "border-token-border-technical/80 shadow-[0_0_15px_-5px_var(--token-border-technical)]" : "border-token-border-technical"} shadow-sm space-y-6 transition-all`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h5 className="text-[11px] font-black text-token-text-secondary uppercase tracking-wider">
                    Módulo Control Interno
                  </h5>
                  <p className="text-[10px] text-token-text-tertiary font-black uppercase tracking-tight mt-2 max-w-xs leading-relaxed">
                    Habilita funciones adicionales como Libro de Novedades, Medidores y
                    Comunicaciones.
                  </p>
                </div>
                <Switch
                  checked={isControlInternoEnabled}
                  onChange={(val) =>
                    updateConfig({
                      key: "is_control_interno_enabled",
                      value: val,
                    })
                  }
                  size="md"
                />
              </div>

              {isControlInternoEnabled && (
                <div className="p-3 bg-amber-500/10 rounded-md border border-amber-500/20 animate-in fade-in slide-in-from-top-1 duration-300">
                  <p className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest text-center">
                    FUNCIONES ACTIVAS: LIBRO, MEDIDORES, NOTAS
                  </p>
                </div>
              )}
            </div>
          </section>

          {currentUser?.role === "Administrador" && (
            <section className="space-y-6 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-sky-500 rounded-sm"></div>
                <div>
                  <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                    Reglamento Empresarial
                  </h4>
                  <p className="text-[9px] font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                    PDF DINÁMICO POR CLIENTE
                  </p>
                </div>
              </div>
              <div className="bg-token-surface-card p-6 rounded-md border border-token-border-technical shadow-sm space-y-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary block">
                    Seleccionar PDF de reglamento
                  </label>
                  <input
                    type="file"
                    accept="application/pdf"
                    onChange={(event) => setPolicyFile(event.target.files?.[0] ?? null)}
                    className="block w-full text-xs font-bold text-token-text-secondary file:mr-3 file:px-3 file:py-2 file:rounded-sm file:border file:border-token-border-technical file:bg-token-surface-stripe file:text-token-text-primary"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleUploadPolicy}
                    disabled={!policyFile || isUploadingPolicy}
                    className="h-10 px-4 bg-sap-blue text-white font-black uppercase tracking-widest text-[10px] rounded-sm"
                  >
                    <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
                    {isUploadingPolicy ? "Subiendo..." : "Publicar Reglamento"}
                  </Button>
                  {policyMeta?.url && (
                    <a
                      href={policyMeta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-4 inline-flex items-center rounded-sm border border-token-border-technical bg-token-surface-stripe text-token-text-primary text-[10px] font-black uppercase tracking-widest"
                    >
                      <DocumentTextIcon className="w-4 h-4 mr-2" />
                      Ver Actual
                    </a>
                  )}
                </div>

                {policyMeta && (
                  <div className="p-4 rounded-sm border border-token-border-subtle bg-token-surface-stripe text-[10px] font-bold text-token-text-secondary uppercase tracking-wide">
                    Archivo activo: {policyMeta.originalName} | Cargado por: {policyMeta.uploadedBy}{" "}
                    | Fecha: {new Date(policyMeta.uploadedAt).toLocaleString("es-CL")}
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </Card>

      <ConfirmationModal
        isOpen={!!emailRecipientToDelete}
        onClose={() => setEmailRecipientToDelete(null)}
        onConfirm={handleConfirmDeleteEmailRecipient}
        title="Eliminar Notificación"
        message={`¿Estás seguro de que deseas retirar a '${emailRecipientToDelete}' de la lista de envíos automáticos?`}
        confirmText="Confirmar Retiro"
        confirmVariant="danger"
      />

      <ConfirmationModal
        isOpen={!!areaToDelete}
        onClose={() => setAreaToDelete(null)}
        onConfirm={handleConfirmDeleteArea}
        title="Eliminar Departamento"
        message={`¿Estás seguro de que deseas eliminar el área '${areaToDelete}'? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Área"
        confirmVariant="danger"
      />

      <ConfirmationModal
        isOpen={!!workdayTypeToDelete}
        onClose={() => setWorkdayTypeToDelete(null)}
        onConfirm={handleConfirmDeleteWorkdayType}
        title="Eliminar Tipo Contrato"
        message={`¿Estás seguro de que deseas eliminar la jornada '${workdayTypeToDelete}'?`}
        confirmText="Eliminar Tipo"
        confirmVariant="danger"
      />
    </div>
  );
};
