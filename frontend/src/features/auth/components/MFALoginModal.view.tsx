import React from "react";

import CinematicModal from "../../../components/ui/CinematicModal";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";

/**
 * Spec 036 T11: `MFALoginModal` es **presentacion pura**.
 *
 * Antes el componente guardaba el codigo en un `useState`, lo filtraba a
 * digitos en el `onChange` y deshabilitaba el boton mientras el codigo no
 * tuviera 6 caracteres. Ahora el valor, el error y los handlers entran por
 * props (los lleva el hook de dominio) y la maqueta es la misma.
 */
export interface MfaLoginModalViewProps {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cancela la verificacion. */
  onCancel: () => void;
  /** Valor del codigo. */
  code: string;
  /** Mensaje de error del campo (o `undefined`). */
  error?: string;
  /** Escribe el codigo (solo digitos, maximo 6). */
  onCodeChange: (value: string) => void;
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

const MfaLoginModalView: React.FC<MfaLoginModalViewProps> = ({
  isOpen,
  onCancel,
  code,
  error,
  onCodeChange,
  isSubmitting,
  formProps,
}) => {
  return (
    <CinematicModal
      isOpen={isOpen}
      onClose={onCancel}
      maxWidth="max-w-md"
      showHeader={false}
      closeOnBackdrop={false}
      closeOnEscape={false}
      ariaLabelledBy="mfa-login-modal-title"
      testId="mfa-login-modal"
      panelClassName="rounded-2xl"
      bodyClassName="p-8"
    >
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-token-accent-brand/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-token-accent-brand/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-8 h-8 text-token-accent-brand"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.74c0 3.823 1.797 7.226 4.59 9.358a11.94 11.94 0 0014.82 0c2.793-2.132 4.59-5.535 4.59-9.358 0-1.25-.203-2.454-.582-3.58a11.959 11.959 0 01-8.418-4.043z"
            />
          </svg>
        </div>
        <h2
          id="mfa-login-modal-title"
          className="text-2xl font-black text-token-text-primary uppercase tracking-tighter"
        >
          Verificación de Identidad
        </h2>
        <p className="text-token-text-secondary text-sm mt-2">
          Ingrese el código de 6 dígitos generado por su aplicación de autenticación.
        </p>
      </div>

      <form {...formProps} data-testid="mfa-login-form" className="space-y-6">
        <div className="flex justify-center">
          <Input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            error={error}
            placeholder="000000"
            className="bg-token-surface-stripe border-token-border-technical text-center text-3xl font-mono tracking-[0.5em] h-16 rounded-2xl focus:border-token-accent-brand focus:ring-token-accent-brand/20"
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Button
            type="button"
            onClick={onCancel}
            variant="secondary"
            className="h-12 rounded-xl text-token-text-secondary font-bold uppercase tracking-widest text-[10px]"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 rounded-xl bg-token-accent-brand hover:opacity-90 text-token-text-onAccent font-black uppercase tracking-[0.2em] text-[10px]"
          >
            {isSubmitting ? "Verificando..." : "Confirmar"}
          </Button>
        </div>
      </form>
    </CinematicModal>
  );
};

export default MfaLoginModalView;
