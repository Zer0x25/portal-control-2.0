import type { FC } from "react";
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
import type { GlobalVariablesManagerController } from "../hooks/useGlobalVariablesController";

const GlobalVariablesManagerView: FC<GlobalVariablesManagerController> = (controller) => {
  const {
    isControlInternoEnabled,
    brandLogo,
    updateConfig,
    currentUser,
    areaList,
    workdayTypeList,
    emailRecipientsList,
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
    isUploadingPolicy,
    logoFile,
    setLogoFile,
    logoUrlInput,
    setLogoUrlInput,
    logoWidthInput,
    setLogoWidthInput,
    logoHeightInput,
    setLogoHeightInput,
    isUploadingLogo,
    isSavingLogo,
    handleUploadPolicy,
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
  } = controller;

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
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-token-accent-brand mt-2">
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
              <div className="w-1 h-6 bg-token-accent-brand rounded-sm"></div>
              <div>
                <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                  Jornada Laboral
                </h4>
                <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
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
                className="w-full h-11 rounded-md bg-token-accent-brand text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-token-accent-brand/20 hover:shadow-token-accent-brand/30"
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
                <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
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
                  aria-label="Agregar nuevo departamento o área"
                  className="w-full sm:w-14 h-11 rounded-md flex items-center justify-center bg-token-accent-brand text-white shadow-lg shadow-token-accent-brand/20 p-0 shrink-0"
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
                            aria-label={`Eliminar área ${area}`}
                            className="p-2 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 focus-visible:opacity-100 border border-rose-500/20"
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
                    <p className="text-xxs font-black uppercase tracking-[0.4em] text-token-text-tertiary">
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
                <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
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
                  aria-label="Agregar nuevo protocolo o tipo de jornada"
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
                            aria-label={`Eliminar protocolo ${type}`}
                            className="p-2 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 focus-visible:opacity-100 border border-rose-500/20"
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
                    <p className="text-xxs font-black uppercase tracking-[0.4em] text-token-text-tertiary">
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
                <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
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
                  aria-label="Registrar nuevo receptor de correo"
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
                          aria-label={`Eliminar receptor ${email}`}
                          className="p-2 rounded-md bg-rose-500/10 text-rose-600 hover:bg-rose-500 hover:text-white transition-all opacity-0 group-hover/item:opacity-100 group-focus-within/item:opacity-100 focus-visible:opacity-100 border border-rose-500/20"
                          onClick={() => handleDeleteEmailRecipient(email)}
                        >
                          <DeleteIcon className="w-4 h-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="py-12 text-center">
                    <p className="text-xxs font-black uppercase tracking-[0.4em] text-token-text-tertiary">
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
                <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
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
                  <p className="text-xxs font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest text-center">
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
                  <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
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
                    aria-label="Seleccionar PDF de reglamento"
                    className="block w-full text-xs font-bold text-token-text-secondary file:mr-3 file:px-3 file:py-2 file:rounded-sm file:border file:border-token-border-technical file:bg-token-surface-stripe file:text-token-text-primary"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={handleUploadPolicy}
                    disabled={!policyFile || isUploadingPolicy}
                    className="h-10 px-4 bg-token-accent-brand text-white font-black uppercase tracking-widest text-[10px] rounded-sm"
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

          {currentUser?.role === "Administrador" && (
            <section className="space-y-6 lg:col-span-2">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-token-accent-brand rounded-sm"></div>
                <div>
                  <h4 className="text-[11px] font-black text-token-text-primary uppercase tracking-[0.2em]">
                    Marca / Logo
                  </h4>
                  <p className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest mt-0.5">
                    LOGO POR CLIENTE · LOGIN
                  </p>
                </div>
              </div>
              <div className="bg-token-surface-card p-6 rounded-md border border-token-border-technical shadow-sm space-y-6">
                <div className="flex items-center gap-6">
                  <div className="w-40 h-20 flex items-center justify-center rounded-sm border border-token-border-subtle bg-token-surface-stripe overflow-hidden shrink-0">
                    {logoPreviewSrc ? (
                      <img
                        src={logoPreviewSrc}
                        alt="Vista previa del logo"
                        width={brandLogo?.width ?? 512}
                        height={brandLogo?.height ?? 188}
                        className="max-h-20 w-auto"
                        decoding="async"
                      />
                    ) : (
                      <span className="text-xxs font-black text-token-text-tertiary uppercase tracking-widest px-2 text-center">
                        Logo por defecto
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] font-bold text-token-text-secondary uppercase tracking-wide">
                    {brandLogo
                      ? `${brandLogo.source.kind === "upload" ? "Archivo subido" : "URL remota"} · ${brandLogo.width}×${brandLogo.height} px`
                      : "Sin configuración: el login usa el logo empaquetado (512×188)."}
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary block">
                    Subir imagen (PNG, JPG o WebP, máx. 5 MB)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                    aria-label="Subir imagen de logo"
                    className="block w-full text-xs font-bold text-token-text-secondary file:mr-3 file:px-3 file:py-2 file:rounded-sm file:border file:border-token-border-technical file:bg-token-surface-stripe file:text-token-text-primary"
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleUploadLogo}
                      disabled={!logoFile || isUploadingLogo}
                      className="h-10 px-4 bg-token-accent-brand text-white font-black uppercase tracking-widest text-[10px] rounded-sm"
                    >
                      {isUploadingLogo ? "Subiendo..." : "Publicar logo"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary block">
                    O usar URL remota (HTTPS)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      value={logoUrlInput}
                      onChange={(event) => setLogoUrlInput(event.target.value)}
                      placeholder="https://cliente.cl/logo.png"
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSaveLogoUrl}
                      disabled={!logoUrlInput.trim() || isSavingLogo}
                      className="h-10 px-4 font-black uppercase tracking-widest text-[10px] rounded-sm"
                    >
                      Guardar URL
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary block">
                    Tamaño (16–512 px)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Input
                      type="number"
                      min={16}
                      max={512}
                      value={logoWidthInput}
                      onChange={(event) => setLogoWidthInput(event.target.value)}
                      placeholder="Ancho"
                      className="sm:w-36"
                    />
                    <Input
                      type="number"
                      min={16}
                      max={512}
                      value={logoHeightInput}
                      onChange={(event) => setLogoHeightInput(event.target.value)}
                      placeholder="Alto"
                      className="sm:w-36"
                    />
                    <Button
                      onClick={handleSaveLogoSize}
                      disabled={!brandLogo || isSavingLogo}
                      className="h-10 px-4 font-black uppercase tracking-widest text-[10px] rounded-sm"
                    >
                      Guardar tamaño
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleResetLogo}
                      disabled={!brandLogo || isSavingLogo}
                      className="h-10 px-4 font-black uppercase tracking-widest text-[10px] rounded-sm"
                    >
                      Restablecer
                    </Button>
                  </div>
                </div>
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

export default GlobalVariablesManagerView;
