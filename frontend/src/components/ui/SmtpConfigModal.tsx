import React, { useState, useEffect } from "react";
import { useToasts } from "../../hooks/useToasts";
import { emailService } from "../../services/emailService";
import { SmtpConfig, MultiSmtpConfig } from "../../types";
import Input from "./Input";
import Button from "./Button";
import {
  CloseIcon,
  ArrowPathIcon,
  ShieldIcon,
  EnvelopeIcon,
  CogIcon,
  CheckCircleIcon,
} from "./icons/index";

interface SmtpConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const initialProfile: SmtpConfig = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromName: "Portal Control Interno",
  fromEmail: "",
};

const initialMultiConfig: MultiSmtpConfig = {
  profiles: [{ ...initialProfile }, { ...initialProfile }, { ...initialProfile }],
  activeProfileIndex: 0,
};

const PRESETS = {
  google: {
    host: "smtp.gmail.com",
    port: 587,
    secure: false, // Gmail uses STARTTLS on 587
  },
  outlook: {
    host: "smtp.office365.com",
    port: 587,
    secure: false, // Outlook uses STARTTLS on 587
  },
};

const SmtpConfigModal: React.FC<SmtpConfigModalProps> = ({ isOpen, onClose }) => {
  const { addToast } = useToasts();
  const [multiConfig, setMultiConfig] = useState<MultiSmtpConfig>(initialMultiConfig);
  const [currentSlot, setCurrentSlot] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      emailService
        .getConfig()
        .then((stored) => {
          if (stored) {
            setMultiConfig(stored);
            setCurrentSlot(stored.activeProfileIndex);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  const currentProfile = multiConfig.profiles[currentSlot];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === "checkbox";
    const isNumber = type === "number";

    const updatedProfile = {
      ...currentProfile,
      [name]: isCheckbox
        ? (e.target as HTMLInputElement).checked
        : isNumber
          ? parseInt(value, 10) || 0
          : value,
    };

    const newProfiles = [...multiConfig.profiles];
    newProfiles[currentSlot] = updatedProfile;

    setMultiConfig((prev) => ({ ...prev, profiles: newProfiles }));
  };

  const applyPreset = (type: "google" | "outlook") => {
    const preset = PRESETS[type];
    const updatedProfile = { ...currentProfile, ...preset };
    const newProfiles = [...multiConfig.profiles];
    newProfiles[currentSlot] = updatedProfile;
    setMultiConfig((prev) => ({ ...prev, profiles: newProfiles }));
    addToast(
      `Valores de ${type === "google" ? "Gmail" : "Outlook"} aplicados al Perfil ${currentSlot + 1}`,
      "success",
    );
  };

  const handleTestConnection = async () => {
    if (!currentProfile.host || !currentProfile.user || !currentProfile.pass) {
      addToast("Complete el host, usuario y contraseña para probar.", "warning");
      return;
    }
    setIsVerifying(true);
    const result = await emailService.verifyConnection(currentProfile);
    if (result.success) {
      addToast(result.message, "success");
    } else {
      addToast(result.message, "error");
    }
    setIsVerifying(false);
  };

  const handleSetActive = () => {
    setMultiConfig((prev) => ({ ...prev, activeProfileIndex: currentSlot }));
    addToast(`Perfil ${currentSlot + 1} marcado como activo`, "info");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await emailService.saveConfig(multiConfig);
    if (result.success) {
      addToast("Configuraciones SMTP guardadas correctamente.", "success");
      onClose();
    } else {
      addToast(result.message, "error");
    }
  };

  return (
    isOpen && (
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
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
            <form onSubmit={handleSave}>
              {/* Profile Selector Tabs */}
              <div className="px-8 pt-6 flex gap-2">
                {[0, 1, 2].map((idx) => (
                  <Button
                    key={idx}
                    variant="none"
                    type="button"
                    onClick={() => setCurrentSlot(idx)}
                    className={`flex-1 flex flex-col items-center justify-center py-3 rounded-md border transition-all duration-300 relative shadow-none ${
                      currentSlot === idx
                        ? "bg-token-accent-brand text-token-text-onAccent border-token-accent-brand shadow-sm"
                        : "bg-token-surface-card text-token-text-tertiary border-token-border-subtle hover:border-token-border-focus/30"
                    }`}
                  >
                    <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                      Perfil
                    </span>
                    <span className="text-lg font-black">{idx + 1}</span>
                    {multiConfig.activeProfileIndex === idx && (
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
                      value={currentProfile.host}
                      onChange={handleInputChange}
                      required
                      placeholder="smtp.office365.com"
                      className="rounded-md"
                    />
                  </div>
                  <div className="md:col-span-4 lowercase">
                    <Input
                      label="Puerto"
                      type="number"
                      name="port"
                      value={currentProfile.port}
                      onChange={handleInputChange}
                      required
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
                      checked={currentProfile.secure}
                      onChange={handleInputChange}
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
                    value={currentProfile.user}
                    onChange={handleInputChange}
                    required
                    placeholder="user@organization.com"
                    className="rounded-md"
                  />
                  <Input
                    label="Contraseña o App Key"
                    type="password"
                    name="pass"
                    value={currentProfile.pass}
                    onChange={handleInputChange}
                    required
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
                      value={currentProfile.fromName}
                      onChange={handleInputChange}
                      required
                      className="rounded-md"
                    />
                    <Input
                      label="Email de Respuesta"
                      type="email"
                      name="fromEmail"
                      value={currentProfile.fromEmail}
                      onChange={handleInputChange}
                      required
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
                    disabled={multiConfig.activeProfileIndex === currentSlot}
                    className={`w-full flex items-center justify-center gap-3 p-4 rounded-md border transition-all shadow-none ${
                      multiConfig.activeProfileIndex === currentSlot
                        ? "bg-token-status-success/10 border-token-status-success/30 text-token-status-success cursor-default"
                        : "bg-token-surface-card border-token-border-subtle hover:border-token-accent-brand text-token-text-secondary"
                    }`}
                  >
                    {multiConfig.activeProfileIndex === currentSlot ? (
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
                  onClick={handleTestConnection}
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

export default SmtpConfigModal;
