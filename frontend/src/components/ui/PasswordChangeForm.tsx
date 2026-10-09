import React, { useState, useMemo } from "react";
import Input from "./Input";
import Button from "./Button";
import { EyeIcon, EyeSlashIcon } from "./icons/index";

type PasswordStrength = "none" | "weak" | "medium" | "strong";

interface PasswordChangeFormProps {
  newPassword: string;
  setNewPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
}

const getPasswordStrength = (password: string): PasswordStrength => {
  if (!password) return "none";
  if (password.length < 6) return "weak";

  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  const hasSymbols = /[^a-zA-Z0-9]/.test(password);

  if (hasLetters && hasNumbers && hasSymbols) return "strong";
  if ((hasLetters && hasNumbers) || (hasLetters && hasSymbols) || (hasNumbers && hasSymbols))
    return "medium";
  return "weak"; // At least 6 chars but only one type
};

const PasswordStrengthIndicator: React.FC<{ strength: PasswordStrength }> = ({ strength }) => {
  const config = useMemo(() => {
    switch (strength) {
      case "weak":
        return { text: "Débil", color: "text-red-500" };
      case "medium":
        return { text: "Media", color: "text-yellow-500" };
      case "strong":
        return { text: "Fuerte", color: "text-green-500" };
      default:
        return { text: "", color: "" };
    }
  }, [strength]);

  if (strength === "none") return null;

  return <p className={`text-xs mt-1 ${config.color}`}>{config.text}</p>;
};

export const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const strength = getPasswordStrength(newPassword);

  return (
    <>
      <div className="relative">
        <Input
          label="Nueva Contraseña"
          id="newPassword"
          type={showPassword ? "text" : "password"}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          autoComplete="new-password"
        />
        <Button
          variant="none"
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 top-6 pr-3 flex items-center text-token-text-tertiary hover:text-token-text-secondary"
          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
        >
          {showPassword ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
        </Button>
      </div>
      <PasswordStrengthIndicator strength={strength} />
      <Input
        label="Confirmar Nueva Contraseña"
        id="confirmPassword"
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        required
        disabled={!newPassword}
        autoComplete="new-password"
      />
    </>
  );
};
