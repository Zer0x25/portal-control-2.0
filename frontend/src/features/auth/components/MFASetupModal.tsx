import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "../../../services/authService";
import { useToasts } from "../../../hooks/useToasts";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MFASetupModal: React.FC<MFASetupModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState<"initial" | "scanning" | "verifying">("initial");
  const [mfaData, setMfaData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const { addToast } = useToasts();

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const data = await authService.setupMFA();
      setMfaData(data);
      setStep("scanning");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Error al iniciar configuración", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (token.length !== 6) return;

    setLoading(true);
    try {
      await authService.verifyMFASetup(token);
      addToast("MFA configurado y habilitado correctamente", "success");
      onSuccess();
      onClose();
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "Código de verificación incorrecto",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setStep("initial");
      setMfaData(null);
      setToken("");
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
          >
            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Configurar MFA
              </h2>
              <p className="text-gray-400 text-sm mt-2">Seguridad de Dos Pasos (TOTP)</p>
            </div>

            {step === "initial" && (
              <div className="space-y-6 text-center">
                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-gray-300 text-sm leading-relaxed">
                  MFA añade una capa adicional de seguridad. Necesitará una aplicación como Google
                  Authenticator o Authy.
                </div>
                <Button
                  onClick={handleStartSetup}
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs"
                >
                  {loading ? "Iniciando..." : "Comenzar Configuración"}
                </Button>
              </div>
            )}

            {step === "scanning" && mfaData && (
              <div className="space-y-6 text-center">
                <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mx-auto">
                  <img src={mfaData.qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
                <div className="space-y-2">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
                    O use el código manual:
                  </p>
                  <code className="block p-3 bg-white/5 rounded-xl text-indigo-400 font-mono text-lg tracking-widest">
                    {mfaData.secret}
                  </code>
                </div>
                <Button
                  onClick={() => setStep("verifying")}
                  className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs"
                >
                  Ya escaneé el código
                </Button>
              </div>
            )}

            {step === "verifying" && (
              <form onSubmit={handleVerify} className="space-y-6">
                <div className="text-center">
                  <p className="text-gray-400 text-sm mb-6">
                    Ingrese el código de 6 dígitos para confirmar la vinculación.
                  </p>
                  <Input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="bg-black/40 border-white/10 text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-2xl focus:border-indigo-500"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    onClick={() => setStep("scanning")}
                    variant="secondary"
                    className="h-12 rounded-xl border-white/5 text-gray-400 font-bold uppercase tracking-widest text-[10px]"
                  >
                    Volver al QR
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || token.length !== 6}
                    className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px]"
                  >
                    {loading ? "Verificando..." : "Habilitar MFA"}
                  </Button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MFASetupModal;
