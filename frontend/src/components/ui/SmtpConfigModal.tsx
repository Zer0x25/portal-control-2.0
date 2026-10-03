import React, { useState, useEffect } from "react";
import { useToasts } from "../../hooks/useToasts";
import { emailService } from "../../services/emailService";
import { SmtpConfig, MultiSmtpConfig } from "../../types";
import Input from "./Input";
import {
  CloseIcon,
  ArrowPathIcon,
  ShieldIcon,
  EnvelopeIcon,
  CogIcon,
  CheckCircleIcon,
} from "./icons/index";
import { motion, AnimatePresence } from "framer-motion";

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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="relative bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-black/10 dark:border-white/10 w-full max-w-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-8 py-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-sap-blue/10 dark:bg-sap-blue/20 text-sap-blue">
                  <CogIcon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-gray-800 dark:text-white leading-none">
                    Gestión de Perfiles SMTP
                  </h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1.5">
                    Estrategia de Comunicación
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-600 dark:hover:text-white transition-all"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>

            {isLoading ? (
              <div className="p-20 flex flex-col items-center justify-center gap-4">
                <ArrowPathIcon className="w-10 h-10 animate-spin text-sap-blue/40" />
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Accediendo al Bóveda de Configuración
                </p>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                {/* Profile Selector Tabs */}
                <div className="px-8 pt-6 flex gap-2">
                  {[0, 1, 2].map((idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCurrentSlot(idx)}
                      className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl border transition-all duration-300 ${
                        currentSlot === idx
                          ? "bg-sap-blue text-white border-sap-blue shadow-lg shadow-sap-blue/20"
                          : "bg-white dark:bg-white/5 text-gray-400 border-gray-100 dark:border-white/5 hover:border-sap-blue/30"
                      }`}
                    >
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-60">
                        Perfil
                      </span>
                      <span className="text-lg font-black">{idx + 1}</span>
                      {multiConfig.activeProfileIndex === idx && (
                        <div className="absolute top-2 right-4">
                          <CheckCircleIcon className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {/* Quick Presets Section */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                      Configuración Rápida
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => applyPreset("google")}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-sap-blue/40 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-red-500 font-bold text-xs">G</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                          Google Workspace
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => applyPreset("outlook")}
                        className="flex items-center gap-3 p-3 rounded-2xl bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 hover:border-sap-blue/40 transition-all group"
                      >
                        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <span className="text-blue-500 font-bold text-xs">O</span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300">
                          Outlook / O365
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Host and Port */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="md:col-span-8">
                      <Input
                        label="Host de Salida"
                        name="host"
                        value={currentProfile.host}
                        onChange={handleInputChange}
                        required
                        placeholder="smtp.office365.com"
                        className="rounded-2xl"
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
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  {/* Encryption Toggle */}
                  <div className="p-4 rounded-3xl bg-sap-blue/5 dark:bg-white/5 border border-sap-blue/10 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-sap-blue/60 mb-0.5">
                        Seguridad
                      </p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-200">
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
                      <div className="w-11 h-6 bg-gray-200 dark:bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-sap-blue"></div>
                    </label>
                  </div>

                  {/* Auth Fields */}
                  <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldIcon className="w-4 h-4 text-sap-blue" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
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
                      className="rounded-2xl"
                    />
                    <Input
                      label="Contraseña o App Key"
                      type="password"
                      name="pass"
                      value={currentProfile.pass}
                      onChange={handleInputChange}
                      required
                      placeholder="••••••••••••"
                      className="rounded-2xl"
                    />
                  </div>

                  {/* Identity Fields */}
                  <div className="space-y-6 pt-4 border-t border-gray-100 dark:border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <EnvelopeIcon className="w-4 h-4 text-sap-blue" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
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
                        className="rounded-2xl"
                      />
                      <Input
                        label="Email de Respuesta"
                        type="email"
                        name="fromEmail"
                        value={currentProfile.fromEmail}
                        onChange={handleInputChange}
                        required
                        className="rounded-2xl"
                      />
                    </div>
                  </div>

                  {/* Set Active Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      onClick={handleSetActive}
                      disabled={multiConfig.activeProfileIndex === currentSlot}
                      className={`w-full flex items-center justify-center gap-3 p-4 rounded-3xl border transition-all ${
                        multiConfig.activeProfileIndex === currentSlot
                          ? "bg-green-500/10 border-green-500/30 text-green-600 cursor-default"
                          : "bg-white dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-sap-blue text-gray-600 dark:text-gray-300"
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
                          <span className="text-[10px] font-black uppercase tracking-widest text-sap-blue">
                            Establecer como Perfil de Salida Predeterminado
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-gray-50/50 dark:bg-black/20 border-t border-gray-100 dark:border-white/5 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isVerifying}
                    className="flex items-center gap-2 px-6 h-12 rounded-2xl bg-white dark:bg-white/5 border border-white/20 text-[10px] font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-all shadow-sm"
                  >
                    {isVerifying ? (
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldIcon className="w-4 h-4 text-sap-blue" />
                    )}
                    {isVerifying ? "Validando..." : "Probar Correo"}
                  </button>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-6 h-12 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all"
                    >
                      Cerrar
                    </button>
                    <button
                      type="submit"
                      className="px-8 h-12 rounded-2xl bg-linear-to-r from-sap-blue to-indigo-600 text-white shadow-lg shadow-sap-blue/20 text-[10px] font-black uppercase tracking-widest hover:shadow-sap-blue/40 transform hover:-translate-y-0.5 active:translate-y-0 transition-all"
                    >
                      Guardar Todo
                    </button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SmtpConfigModal;
