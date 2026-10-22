import React from "react";

import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { Z } from "../../../constants/zScale";
import type { MfaSetupStep } from "../hooks/useMfaSetupModalController";

/**
 * Spec 036 T11: `MFASetupModal` es **presentacion pura**.
 *
 * Antes el componente guardaba el codigo TOTP en un `useState`, lo filtraba a
 * digitos en el `onChange` y volvia atras sin explicacion si el codigo no
 * tenia 6 caracteres. Ahora el valor, el error y los handlers entran por
 * props (los lleva el hook de dominio) y la maqueta es la misma.
 */
export interface MfaSetupModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
  /** Paso actual del asistente. */
  step: MfaSetupStep;
  /** QR y secreto que devolvio el backend. */
  mfaData: { qrCode: string; secret: string } | null;
  /** Valor del codigo TOTP. */
  token: string;
  /** Mensaje de error del campo (o `undefined`). */
  error?: string;
  /** Escribe el codigo TOTP (solo digitos, maximo 6). */
  onTokenChange: (value: string) => void;
  /** Pide el QR al backend. */
  onStartSetup: () => void;
  /** Vuelve al paso del QR. */
  onGoToScanning: () => void;
  /** Pasa al paso de verificacion. */
  onGoToVerifying: () => void;
  /** Se esta pidiendo el QR. */
  isStarting: boolean;
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

const MfaSetupModalView: React.FC<MfaSetupModalViewProps> = ({
  isOpen,
  onClose,
  step,
  mfaData,
  token,
  error,
  onTokenChange,
  onStartSetup,
  onGoToScanning,
  onGoToVerifying,
  isStarting,
  isSubmitting,
  formProps,
}) => {
  return (
    isOpen && (
      <div
        data-testid="mfa-setup-modal"
        className={`fixed inset-0 ${Z.modal} flex items-center justify-center p-6`}
      >
        <div
          className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in"
          onClick={onClose}
        />

        <div
          className={`w-full max-w-md bg-token-surface-card border border-token-border-technical rounded-2xl p-8 shadow-2xl relative ${Z.sticky} animate-in fade-in zoom-in-95 slide-in-from-bottom-2`}
        >
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-token-text-primary uppercase tracking-tighter">
              Configurar MFA
            </h2>
            <p className="text-token-text-secondary text-sm mt-2">Seguridad de Dos Pasos (TOTP)</p>
          </div>

          {step === "initial" && (
            <div className="space-y-6 text-center">
              <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 text-token-text-secondary text-sm leading-relaxed">
                MFA añade una capa adicional de seguridad. Necesitará una aplicación como Google
                Authenticator o Authy.
              </div>
              <Button
                onClick={onStartSetup}
                disabled={isStarting}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs"
              >
                {isStarting ? "Iniciando..." : "Comenzar Configuración"}
              </Button>
            </div>
          )}

          {step === "scanning" && mfaData && (
            <div className="space-y-6 text-center">
              <div className="bg-white p-4 rounded-2xl inline-block shadow-xl mx-auto">
                <img src={mfaData.qrCode} alt="QR Code" className="w-48 h-48" />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-token-text-tertiary font-bold uppercase tracking-widest">
                  O use el código manual:
                </p>
                <code className="block p-3 bg-white/5 rounded-xl text-indigo-400 font-mono text-lg tracking-widest">
                  {mfaData.secret}
                </code>
              </div>
              <Button
                onClick={onGoToVerifying}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-xs"
              >
                Ya escaneé el código
              </Button>
            </div>
          )}

          {step === "verifying" && (
            <form {...formProps} data-testid="mfa-setup-form" className="space-y-6">
              <div className="text-center">
                <p className="text-token-text-secondary text-sm mb-6">
                  Ingrese el código de 6 dígitos para confirmar la vinculación.
                </p>
                <Input
                  type="text"
                  value={token}
                  onChange={(e) => onTokenChange(e.target.value)}
                  error={error}
                  placeholder="000000"
                  className="bg-black/40 border-white/10 text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-2xl focus:border-indigo-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  onClick={onGoToScanning}
                  variant="secondary"
                  className="h-12 rounded-xl text-token-text-secondary font-bold uppercase tracking-widest text-[10px]"
                >
                  Volver al QR
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest text-[10px]"
                >
                  {isSubmitting ? "Verificando..." : "Habilitar MFA"}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    )
  );
};

export default MfaSetupModalView;
