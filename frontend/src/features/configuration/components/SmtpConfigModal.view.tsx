import React from "react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import {
  CloseIcon,
  ArrowPathIcon,
  ShieldIcon,
  EnvelopeIcon,
  CogIcon,
  CheckCircleIcon,
} from "../../../components/ui/icons/index";
import { Z } from "../../../constants/zScale";
import type { SmtpProfileFormValues } from "../../../schemas/forms/smtp";

/**
 * Spec 036 T10c: `SmtpConfigModal` es **presentacion pura**.
 *
 * Antes el componente guardaba los tres perfiles en un `useState` y escribia
 * en ellos con un `handleInputChange` que repartia el tipo segun el `type` del
 * `<input>`. Ahora los valores, los errores y los handlers entran por props
 * (los lleva el hook de dominio) y la maqueta es la misma.
 */
export interface SmtpConfigModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Valores del perfil que se esta editando. */
  values: SmtpProfileFormValues;
  /** Mensaje de error de un campo (o `undefined`). */
  getError: (field: string) => string | undefined;
  /** Escribe un campo del perfil. */
  handleFieldChange: <K extends keyof SmtpProfileFormValues>(
    field: K,
    value: SmtpProfileFormValues[K],
  ) => void;
  /** Aplica un preset de servidor. */
  applyPreset: (type: "google" | "outlook") => void;
  /** Prueba la conexion SMTP. */
  handleTestConnection: () => Promise<void>;
  /** Marca el perfil actual como el de salida. */
  handleSetActive: () => void;
  /** Cambia de perfil. */
  selectSlot: (index: number) => void;
  /** El perfil que se esta editando. */
  currentSlot: number;
  /** El perfil de salida configurado. */
  activeProfileIndex: number;
  /** Se esta cargando la configuracion guardada. */
  isLoading: boolean;
  /** Se esta probando la conexion. */
  isVerifying: boolean;
  /** Hay un envio en vuelo. */
  isSubmitting: boolean;
  /** Props del `<form>` (id, `noValidate` y `onSubmit` de la capa). */
  formProps: {
    id: string;
    noValidate: true;
    onSubmit: (event: { preventDefault: () => void }) => void;
    "data-app-form": string;
  };
}

const SmtpConfigModalView: React.FC<SmtpConfigModalViewProps> = ({
  isOpen,
  onClose,
  values,
  getError,
  handleFieldChange,
  applyPreset,
  handleTestConnection,
  handleSetActive,
  selectSlot,
  currentSlot,
  activeProfileIndex,
  isLoading,
  isVerifying,
  isSubmitting,
  formProps,
}) => {
  return (
    isOpen && (
      <div className={`fixed inset-0 ${Z.modal} flex items-center justify-center p-4`}>
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={onClose}
        />

        <div
          className="relative bg-token-surface-card rounded-lg shadow-2xl border border-token-border-technical w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-2"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-8 py-6 border-b border-token-border-subtle flex justify-between items-center bg-token-surface-stripe">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-md bg-token-accent-brand/10 text-token-accent-brand">
                <CogIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-token-text-primary leading-none">
                  Gestión de Perfiles SMTP
                </h3>
                <p className="text-[10px] text-token-text-tertiary font-bold uppercase tracking-widest mt-1.5">
                  Estrategia de Comunicación
                </p>
              </div>
            </div>
            <Button
              variant="none"
              onClick={onClose}
              className="w-10 h-10 rounded-full flex items-center justify-center text-token-text-tertiary hover:bg-token-surface-hover hover:text-token-text-primary transition-all shadow-none"
            >
              <CloseIcon className="w-5 h-5" />
            </Button>
          </div>

          {isLoading ? (
            <div className="p-20 flex flex-col items-center justify-center gap-4">
              <ArrowPathIcon className="w-10 h-10 animate-spin text-token-accent-brand/40" />
              <p className="text-[10px] font-black uppercase tracking-widest text-token-text-tertiary">
                Accediendo al Bóveda de Configuración
              </p>
            </div>
          ) : (
            <form {...formProps}>
              {/* Profile Selector Tabs */}
              <div className="px-8 pt-6 flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <Button
                    key={idx}
                    variant="none"
                    type="button"
                    onClick={() => selectSlot(idx)}
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-md border transition-all duration-300 relative shadow-none ${
                      currentSlot === idx
                        ? "bg-token-accent-brand text-token-text-onAccent border-token-accent-brand shadow-sm"
                        : "bg-token-surface-card text-token-text-tertiary border-token-border-subtle hover:border-token-border-focus/30"
                    }`}
                  >
                    <span className="text-xxs font-black uppercase tracking-widest opacity-60">
                      Perfil
                    </span>
                    <span className="text-lg font-black">{idx + 1}</span>
                    {activeProfileIndex === idx && (
                      <div className="absolute top-2 right-4">
                        <CheckCircleIcon className="w-4 h-4 text-token-text-onAccent" />
                      </div>
                    )}
                  </Button>
                ))}
              </div>

              <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                {/* Quick Presets Section */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-token-text-tertiary ml-1">
                    Configuración Rápida
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="none"
                      type="button"
                      onClick={() => applyPreset("google")}
                      className="flex items-center gap-3 p-3 rounded-md bg-token-surface-card border border-token-border-subtle hover:border-token-border-focus/40 transition-all group shadow-none"
                    >
                      <div className="w-8 h-8 rounded-md bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-red-500 font-bold text-xs">G</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary">
                        Google Workspace
                      </span>
                    </Button>
                    <Button
                      variant="none"
                      type="button"
                      onClick={() => applyPreset("outlook")}
                      className="flex items-center gap-3 p-3 rounded-md bg-token-surface-card border border-token-border-subtle hover:border-token-border-focus/40 transition-all group shadow-none"
                    >
                      <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                        <span className="text-blue-500 font-bold text-xs">O</span>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-token-text-secondary">
                        Outlook / O365
                      </span>
                    </Button>
                  </div>
                </div>

                {/* Host and Port */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-token-border-subtle">
                  <div className="md:col-span-8">
                    <Input
                      label="Host de Salida"
                      name="host"
                      value={values.host}
                      onChange={(e) => handleFieldChange("host", e.target.value)}
                      error={getError("host")}
                      placeholder="smtp.office365.com"
                      className="rounded-md"
                    />
                  </div>
                  <div className="md:col-span-4 lowercase">
                    <Input
                      label="Puerto"
                      type="number"
                      name="port"
                      value={values.port}
                      onChange={(e) =>
                        handleFieldChange("port", Number.parseInt(e.target.value, 10) || 0)
                      }
                      error={getError("port")}
                      className="rounded-md"
                    />
                  </div>
                </div>

                {/* Encryption Toggle */}
                <div className="p-4 rounded-md bg-token-surface-stripe border border-token-border-subtle flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-token-accent-brand/60 mb-0.5">
                      Seguridad
                    </p>
                    <p className="text-xs font-bold text-token-text-primary">
                      Usar Protocolo SSL/TLS Seguro
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="secure"
                      className="sr-only peer"
                      checked={values.secure}
                      onChange={(e) => handleFieldChange("secure", e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-token-surface-technical peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-token-border-technical after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-token-accent-brand"></div>
                  </label>
                </div>

                {/* Auth Fields */}
                <div className="space-y-6 pt-4 border-t border-token-border-subtle">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldIcon className="w-4 h-4 text-token-accent-brand" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-token-text-tertiary">
                      Autenticación Perfil {currentSlot + 1}
                    </span>
                  </div>
                  <Input
                    label="Email de Usuario"
                    type="email"
                    name="user"
                    value={values.user}
                    onChange={(e) => handleFieldChange("user", e.target.value)}
                    error={getError("user")}
                    placeholder="user@organization.com"
                    className="rounded-md"
                  />
                  <Input
                    label="Contraseña o App Key"
                    type="password"
                    name="pass"
                    value={values.pass}
                    onChange={(e) => handleFieldChange("pass", e.target.value)}
                    error={getError("pass")}
                    placeholder="Contraseña nueva si cambias servidor o usuario"
                    className="rounded-md"
                  />
                </div>

                {/* Identity Fields */}
                <div className="space-y-6 pt-4 border-t border-token-border-subtle">
                  <div className="flex items-center gap-2 mb-2">
                    <EnvelopeIcon className="w-4 h-4 text-token-accent-brand" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-token-text-tertiary">
                      Identidad Digital
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Input
                      label="Nombre Visible"
                      name="fromName"
                      value={values.fromName}
                      onChange={(e) => handleFieldChange("fromName", e.target.value)}
                      error={getError("fromName")}
                      className="rounded-md"
                    />
                    <Input
                      label="Email de Respuesta"
                      type="email"
                      name="fromEmail"
                      value={values.fromEmail}
                      onChange={(e) => handleFieldChange("fromEmail", e.target.value)}
                      error={getError("fromEmail")}
                      className="rounded-md"
                    />
                  </div>
                </div>

                {/* Set Active Button */}
                <div className="pt-4">
                  <Button
                    variant="none"
                    type="button"
                    onClick={handleSetActive}
                    disabled={activeProfileIndex === currentSlot}
                    className={`w-full flex items-center justify-center gap-3 p-4 rounded-md border transition-all shadow-none ${
                      activeProfileIndex === currentSlot
                        ? "bg-token-status-success/10 border-token-status-success/30 text-token-status-success cursor-default"
                        : "bg-token-surface-card border-token-border-subtle hover:border-token-accent-brand text-token-text-secondary"
                    }`}
                  >
                    {activeProfileIndex === currentSlot ? (
                      <>
                        <CheckCircleIcon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                          Este perfil está configurado como PRINCIPAL
                        </span>
                      </>
                    ) : (
                      <>
                        <ArrowPathIcon className="w-5 h-5" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-token-accent-brand">
                          Establecer como Perfil de Salida Predeterminado
                        </span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 bg-token-surface-stripe border-t border-token-border-subtle flex items-center justify-between gap-4">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => void handleTestConnection()}
                  disabled={isVerifying}
                  className="flex items-center gap-2 px-6 h-12 rounded-md border-token-border-technical text-[10px] font-black uppercase tracking-widest text-token-text-secondary hover:bg-token-surface-hover shadow-sm"
                >
                  {isVerifying ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldIcon className="w-4 h-4 text-token-accent-brand" />
                  )}
                  {isVerifying ? "Validando..." : "Probar Correo"}
                </Button>

                <div className="flex gap-3">
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={onClose}
                    className="px-6 h-12 rounded-md text-[10px] font-black uppercase tracking-widest text-token-text-tertiary hover:text-token-text-primary"
                  >
                    Cerrar
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={isSubmitting}
                    className="px-8 h-12 rounded-md text-[10px] font-black uppercase tracking-widest"
                  >
                    Guardar Todo
                  </Button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  );
};

export default SmtpConfigModalView;
