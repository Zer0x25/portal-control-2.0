import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import Button from "./Button";
import LoadingSpinner from "./LoadingSpinner";
import { importService } from "../../services/importService";
import {
  DocumentArrowDownIcon,
  CloseIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
} from "./icons";

/** A single read-excel-file column mapping (serialized to the backend preview endpoint). */
export interface ImportFieldSchema {
  prop: string;
  type: StringConstructor;
  required?: boolean;
}

/** Values a previewed cell can hold once read from an Excel column. */
export type ImportCellValue = string | number | boolean | Date | null | undefined;

/** One previewed row: a loose record keyed by the Excel column headers. */
export type ImportPreviewRow = Record<string, ImportCellValue>;

interface ImportModalProps<T extends ImportPreviewRow> {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: T[]) => Promise<boolean>;
  title: string;
  templateUrl?: string; // URL to download a template
  schema: Record<string, ImportFieldSchema>; // read-excel-file schema
}

/** Extracts a human-readable message from a thrown value, mirroring the previous `any` access. */
const extractErrorMessage = (error: unknown): string | undefined => {
  if (error instanceof Error) return error.message;
  if (error !== null && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === "string" ? message : undefined;
  }
  return undefined;
};

/**
 * Generic over the imported row shape so consumers keep their own domain type
 * (`Partial<Employee>`, etc.) instead of receiving `any[]`.
 */
const ImportModal = <T extends ImportPreviewRow>({
  isOpen,
  onClose,
  onImport,
  title,
  templateUrl,
  schema,
}: ImportModalProps<T>) => {
  const [previewData, setPreviewData] = useState<T[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "success">("upload");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // setFile(selectedFile);
    setIsLoading(true);
    setErrors([]);

    try {
      const { rows } = await importService.previewImport(selectedFile, schema);
      setPreviewData(rows as T[]);
      setStep("preview");
    } catch (error: unknown) {
      console.error("Error parsing file:", error);
      setErrors([
        extractErrorMessage(error) ||
          "Error al leer el archivo. Asegúrese de que sea un Excel válido.",
      ]);
      setStep("upload");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    setIsLoading(true);
    setStep("importing");
    try {
      const success = await onImport(previewData);
      if (success) {
        setStep("success");
      } else {
        setStep("preview"); // Go back to preview on failure
        setErrors(["Falló la importación en el servidor."]);
      }
    } catch (error: unknown) {
      console.error("Import error:", error);
      setStep("preview");
      setErrors(["Ocurrió un error inesperado."]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // setFile(null);
    setPreviewData([]);
    setErrors([]);
    setStep("upload");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-token-surface-card rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-token-border-technical"
      >
        {/* Header */}
        <div className="p-6 border-b border-token-border-subtle flex justify-between items-center bg-token-surface-stripe">
          <div>
            <h2 className="text-xl font-black text-token-text-primary uppercase tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-token-text-tertiary font-bold uppercase tracking-widest mt-1">
              Asistente de Importación
            </p>
          </div>
          <Button
            variant="none"
            onClick={handleClose}
            className="p-2 hover:bg-token-surface-hover rounded-full transition-colors shadow-none"
          >
            <CloseIcon className="w-6 h-6 text-token-text-tertiary" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md bg-token-accent-brand/5 border-2 border-dashed border-token-accent-brand/30 rounded-lg p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-token-accent-brand/10 transition-all group"
              >
                <DocumentArrowUpIcon className="w-16 h-16 text-token-accent-brand mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-black text-token-accent-brand uppercase tracking-widest text-center">
                  Click para seleccionar archivo
                </p>
                <p className="text-xs text-token-text-tertiary mt-2 text-center">Soporta .xlsx</p>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".xlsx, .xls"
                className="hidden"
              />

              {templateUrl && (
                <a
                  href={templateUrl}
                  className="flex items-center gap-2 text-xs font-bold text-token-text-secondary hover:text-token-accent-brand underline uppercase tracking-widest"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" /> Bajar Plantilla de Ejemplo
                </a>
              )}

              {errors.length > 0 && (
                <div className="w-full bg-token-status-error/10 border border-token-status-error/20 rounded-lg p-4">
                  <h4 className="text-xs font-black text-token-status-error uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" /> Errores detectados
                  </h4>
                  <ul className="list-disc list-inside text-xs text-token-status-error space-y-1">
                    {errors.slice(0, 5).map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                    {errors.length > 5 && <li>... y {errors.length - 5} más.</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step === "preview" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-token-text-primary uppercase tracking-widest">
                  Vista Previa ({previewData.length} registros)
                </h3>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    // setFile(null);
                    setStep("upload");
                  }}
                >
                  Cambiar Archivo
                </Button>
              </div>

              <div className="bg-token-surface-card rounded-lg border border-token-border-subtle overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-token-surface-stripe text-token-text-secondary font-bold uppercase tracking-wider">
                    <tr>
                      {previewData.length > 0 &&
                        Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="px-4 py-3">
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-token-border-subtle">
                    {previewData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td key={j} className="px-4 py-2 text-token-text-secondary font-mono">
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-token-text-tertiary italic">
                    ... {previewData.length - 10} registros más
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner className="w-12 h-12 text-token-accent-brand mb-4" />
              <p className="text-sm font-black text-token-text-secondary uppercase tracking-widest animate-pulse">
                Procesando Importación...
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-20 h-20 bg-token-status-success/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-10 h-10 text-token-status-success" />
              </div>
              <h3 className="text-2xl font-black text-token-text-primary uppercase italic tracking-tight mb-2">
                ¡Importación Exitosa!
              </h3>
              <p className="text-sm text-token-text-secondary mb-8">
                Se han procesado correctamente los registros.
              </p>
              <Button variant="success" onClick={handleClose}>
                Finalizar
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === "preview" && (
          <div className="p-6 border-t border-token-border-subtle bg-token-surface-stripe flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleImport} disabled={isLoading}>
              Confirmar Importación
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ImportModal;
