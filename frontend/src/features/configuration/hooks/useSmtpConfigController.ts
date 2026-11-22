import { useEffect, useMemo, useState } from "react";
import { z } from "zod";

import { useAppForm } from "../../../hooks/useAppForm";
import { useToasts } from "../../../hooks/useToasts";
import {
  buildSmtpProfileFormSchema,
  type SmtpProfileFormValues,
} from "../../../schemas/forms/smtp";
import { emailService } from "../../../services/emailService";
import type { MultiSmtpConfig, SmtpConfig } from "../../../types/index";

/**
 * Spec 036 T10c (AC1, AC2, AC3): formulario de **perfiles SMTP**
 * (`SmtpConfigModal.tsx`).
 *
 * Antes el modal guardaba los tres perfiles en un `useState` y escribia en
 * ellos con un `handleInputChange` que repartia el tipo segun el `type` del
 * `<input>`; los campos obligatorios losostenia el `required` nativo del
 * navegador (que `noValidate` desactiva). Ahora:
 *
 * - el perfil que se esta editando vive en `useAppForm` (spec 036 AC1);
 * - las reglas viven en el schema (`buildSmtpProfileFormSchema`: host,
 *   usuario, contrasena, nombre del remitente y remitente obligatorios, y el
 *   remitente tiene que ser un correo valido) (spec 036 AC2);
 * - los errores salen junto al campo, con su mensaje en el mapa central
 *   (spec 036 AC3).
 *
 * Los **tres** perfiles se siguen guardando: el que se esta editando sale del
 * formulario y los otros dos del estado del hook. El payload no cambia: sigue
 * siendo el `MultiSmtpConfig` completo (`{profiles, activeProfileIndex}`), con
 * las cadenas vacias tal cual (spec 036 T13).
 */

/** Perfil con el que arranca cada uno de los tres perfiles. */
const initialProfile: SmtpConfig = {
  host: "",
  port: 587,
  secure: false,
  user: "",
  pass: "",
  fromName: "Portal Control Interno",
  fromEmail: "",
};

/** Configuracion inicial: tres perfiles y el primero activo. */
const initialMultiConfig: MultiSmtpConfig = {
  profiles: [{ ...initialProfile }, { ...initialProfile }, { ...initialProfile }],
  activeProfileIndex: 0,
};

/** Presets de servidor (host, puerto y cifrado). */
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
} as const;

/** Convierte los valores del formulario en un perfil del contrato. */
const toSmtpConfig = (values: SmtpProfileFormValues): SmtpConfig => ({
  host: values.host,
  port: values.port,
  secure: values.secure,
  user: values.user,
  pass: values.pass,
  fromName: values.fromName,
  fromEmail: values.fromEmail,
});

/** Indica si un perfil SMTP está sin configurar (campos principales vacíos). */
const isProfileEmpty = (profile: SmtpProfileFormValues): boolean =>
  profile.host.trim() === "" &&
  profile.user.trim() === "" &&
  profile.pass.trim() === "" &&
  profile.fromEmail.trim() === "";

/** Opciones del hook del formulario de perfiles SMTP. */
export interface UseSmtpConfigControllerOptions {
  /** El modal esta abierto. */
  isOpen: boolean;
  /** Cierra el modal. */
  onClose: () => void;
}

/** Controlador del formulario de perfiles SMTP (spec 036 T10c). */
export const useSmtpConfigController = ({ isOpen, onClose }: UseSmtpConfigControllerOptions) => {
  const { addToast } = useToasts();

  /** Los tres perfiles (el que se edita vive ademas en el formulario). */
  const [profiles, setProfiles] = useState<SmtpConfig[]>(() =>
    initialMultiConfig.profiles.map((profile) => ({ ...profile })),
  );
  /** El perfil con el que el backend envia. */
  const [activeProfileIndex, setActiveProfileIndex] = useState(
    initialMultiConfig.activeProfileIndex,
  );
  /** El perfil que se esta editando. */
  const [currentSlot, setCurrentSlot] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  const profileSchema = useMemo(
    () =>
      z.any().superRefine((val, ctx) => {
        const values = val as SmtpProfileFormValues;
        if (currentSlot !== activeProfileIndex && isProfileEmpty(values)) {
          return;
        }
        const parsed = buildSmtpProfileFormSchema().safeParse(values);
        if (!parsed.success) {
          for (const issue of parsed.error.issues) {
            ctx.addIssue({
              code: "custom",
              message: issue.message,
              path: issue.path,
            });
          }
        }
      }),
    [currentSlot, activeProfileIndex],
  );

  const form = useAppForm<SmtpProfileFormValues, MultiSmtpConfig>({
    schema: profileSchema,
    defaultValues: toSmtpConfig(initialProfile),
    /**
     * El payload tiene que ser **byte a byte** el de siempre: las cadenas
     * vacias viajan ("" y no `undefined`), porque el backend las distingue
     * de un campo ausente.
     */
    normalize: (values) => values,
    serialize: (values) => ({
      profiles: profiles.map((profile, index) =>
        index === currentSlot ? toSmtpConfig(values) : profile,
      ),
      activeProfileIndex,
    }),
    onSubmit: async (payload) => {
      const strictSchema = buildSmtpProfileFormSchema();
      const activeProfile = payload.profiles[payload.activeProfileIndex];
      const activeValidation = activeProfile
        ? strictSchema.safeParse(activeProfile)
        : { success: false as const, error: { issues: [{ message: "Perfil activo inválido." }] } };
      if (!activeValidation.success) {
        addToast(
          `Perfil activo (${payload.activeProfileIndex + 1}): ${
            activeValidation.error.issues[0]?.message ?? "Configuración incompleta."
          }`,
          "error",
        );
        return;
      }

      for (let idx = 0; idx < payload.profiles.length; idx++) {
        if (idx === payload.activeProfileIndex) continue;
        const slotProfile = payload.profiles[idx];
        if (!slotProfile || isProfileEmpty(slotProfile)) continue;
        const slotValidation = strictSchema.safeParse(slotProfile);
        if (!slotValidation.success) {
          addToast(
            `Perfil ${idx + 1}: ${
              slotValidation.error.issues[0]?.message ?? "Configuración incompleta."
            }`,
            "error",
          );
          return;
        }
      }

      const result = await emailService.saveConfig(payload);
      if (result.success) {
        addToast("Configuraciones SMTP guardadas correctamente.", "success");
        onClose();
      } else {
        addToast(result.message, "error");
      }
    },
  });

  const { reset, setValue, form: tanstackForm } = form;

  /**
   * Los valores **vivos** del formulario.
   *
   * `form.values` es la foto del ultimo render: si el usuario escribe y cambia
   * de perfil en el mismo tick, esa foto todavia no tiene la escritura.
   * `tanstackForm.state` si la tiene.
   */
  const liveValues = (): SmtpProfileFormValues => tanstackForm.state.values;

  /** Carga la configuracion guardada cada vez que se abre el modal. */
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  /** Carga la configuracion guardada cada vez que se abre el modal. */
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setIsLoading(true);
    emailService
      .getConfig()
      .then((stored) => {
        if (cancelled || !stored) return;
        const normalizedProfiles = [0, 1, 2].map(
          (idx) => stored.profiles?.[idx] ?? { ...initialProfile },
        );
        const safeActive =
          stored.activeProfileIndex >= 0 && stored.activeProfileIndex <= 2
            ? stored.activeProfileIndex
            : 0;
        setProfiles(normalizedProfiles);
        setActiveProfileIndex(safeActive);
        setCurrentSlot(safeActive);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  /** El formulario refleja siempre el perfil del slot que se esta editando. */
  useEffect(() => {
    reset(toSmtpConfig(profiles[currentSlot] ?? initialProfile));
  }, [currentSlot, profiles, reset]);

  /** Cambia de perfil: guarda el que se editaba y carga el nuevo. */
  const selectSlot = (index: number) => {
    setProfiles((prev) =>
      prev.map((profile, slot) => (slot === currentSlot ? toSmtpConfig(liveValues()) : profile)),
    );
    setCurrentSlot(index);
  };

  /** Escribe un campo del perfil que se esta editando y sincroniza puerto/TLS estándar. */
  const handleFieldChange = <K extends keyof SmtpProfileFormValues>(
    field: K,
    value: SmtpProfileFormValues[K],
  ) => {
    setValue(field, value);
    if (field === "secure") {
      const currentPort = liveValues().port;
      if (value === true && (currentPort === 587 || currentPort === 0)) {
        setValue("port", 465);
      } else if (value === false && (currentPort === 465 || currentPort === 0)) {
        setValue("port", 587);
      }
    } else if (field === "port") {
      if (value === 465) {
        setValue("secure", true);
      } else if (value === 587) {
        setValue("secure", false);
      }
    }
  };

  /** Aplica un preset de servidor al perfil que se esta editando. */
  const applyPreset = (type: "google" | "outlook") => {
    const preset = PRESETS[type];
    setValue("host", preset.host);
    setValue("port", preset.port);
    setValue("secure", preset.secure);
    addToast(
      `Valores de ${type === "google" ? "Gmail" : "Outlook"} aplicados al Perfil ${currentSlot + 1}`,
      "success",
    );
  };

  /** Prueba la conexion con el perfil que se esta editando. */
  const handleTestConnection = async () => {
    const profile = toSmtpConfig(liveValues());
    if (!profile.host || !profile.user || !profile.pass) {
      addToast("Complete el host, usuario y contraseña para probar.", "warning");
      return;
    }
    setIsVerifying(true);
    const result = await emailService.verifyConnection(profile);
    if (result.success) {
      addToast(result.message, "success");
    } else {
      addToast(result.message, "error");
    }
    setIsVerifying(false);
  };

  /** Marca el perfil que se esta editando como el perfil de salida. */
  const handleSetActive = () => {
    setActiveProfileIndex(currentSlot);
    addToast(`Perfil ${currentSlot + 1} marcado como activo`, "info");
  };

  return {
    values: form.values,
    getError: form.getError,
    handleFieldChange,
    applyPreset,
    handleTestConnection,
    handleSetActive,
    selectSlot,
    currentSlot,
    activeProfileIndex,
    isLoading,
    isVerifying,
    isSubmitting: form.isSubmitting,
    formProps: form.formProps,
    submit: form.submit,
  };
};
