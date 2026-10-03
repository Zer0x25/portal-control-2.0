import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

interface MFALoginModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const MFALoginModal: React.FC<MFALoginModalProps> = ({ isOpen, onSuccess, onCancel }) => {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { validateMFACode } = useAuth();
  const { addToast } = useToasts();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      addToast("El código debe ser de 6 dígitos", "error");
      return;
    }

    setLoading(true);
    try {
      await validateMFACode(code);
      addToast("Verificación exitosa", "success");
      onSuccess();
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Código inválido", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onCancel}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-full max-w-md bg-[#0a0a0c] border border-white/10 rounded-3xl p-8 shadow-2xl relative z-10"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-500/20">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-8 h-8 text-indigo-500"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.74c0 3.823 1.797 7.226 4.59 9.358a11.94 11.94 0 0014.82 0c2.793-2.132 4.59-5.535 4.59-9.358 0-1.25-.203-2.454-.582-3.58a11.959 11.959 0 01-8.418-4.043z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">
                Verificación de Identidad
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                Ingrese el código de 6 dígitos generado por su aplicación de autenticación.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex justify-center">
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="bg-black/40 border-white/10 text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-2xl focus:border-indigo-500 focus:ring-indigo-500/20"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  onClick={onCancel}
                  variant="secondary"
                  className="h-12 rounded-xl border-white/5 hover:bg-white/5 text-gray-400 font-bold uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] text-[10px]"
                >
                  {loading ? "Verificando..." : "Confirmar"}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default MFALoginModal;
