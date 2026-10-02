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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
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
        className="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">
              Asistente de Importación
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <CloseIcon className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto flex-1">
          {step === "upload" && (
            <div className="flex flex-col items-center justify-center space-y-6 py-8">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full max-w-md bg-sap-blue/5 border-2 border-dashed border-sap-blue/30 rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-sap-blue/10 transition-all group"
              >
                <DocumentArrowUpIcon className="w-16 h-16 text-sap-blue mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-sm font-black text-sap-blue uppercase tracking-widest text-center">
                  Click para seleccionar archivo
                </p>
                <p className="text-xs text-gray-400 mt-2 text-center">Soporta .xlsx</p>
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
                  className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-sap-blue underline uppercase tracking-widest"
                >
                  <DocumentArrowDownIcon className="w-4 h-4" /> Bajar Plantilla de Ejemplo
                </a>
              )}

              {errors.length > 0 && (
                <div className="w-full bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-500/20 rounded-xl p-4">
                  <h4 className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-4 h-4" /> Errores detectados
                  </h4>
                  <ul className="list-disc list-inside text-xs text-red-500 space-y-1">
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
                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-widest">
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

              <div className="bg-gray-50 dark:bg-black/20 rounded-2xl border border-gray-100 dark:border-white/5 overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                    <tr>
                      {previewData.length > 0 &&
                        Object.keys(previewData[0]).map((key) => (
                          <th key={key} className="px-4 py-3">
                            {key}
                          </th>
                        ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {previewData.slice(0, 10).map((row, i) => (
                      <tr key={i}>
                        {Object.values(row).map((val, j) => (
                          <td
                            key={j}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 font-mono"
                          >
                            {String(val)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="p-2 text-center text-xs text-gray-400 italic">
                    ... {previewData.length - 10} registros más
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner className="w-12 h-12 text-sap-blue mb-4" />
              <p className="text-sm font-black text-gray-600 dark:text-gray-300 uppercase tracking-widest animate-pulse">
                Procesando Importación...
              </p>
            </div>
          )}

          {step === "success" && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-500/10 rounded-full flex items-center justify-center mb-6">
                <CheckCircleIcon className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase italic tracking-tight mb-2">
                ¡Importación Exitosa!
              </h3>
              <p className="text-sm text-gray-500 mb-8">
                Se han procesado correctamente los registros.
              </p>
              <Button
                onClick={handleClose}
                className="bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30"
              >
                Finalizar
              </Button>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {step === "preview" && (
          <div className="p-6 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 flex justify-end gap-3">
            <Button variant="secondary" onClick={handleClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading}
              className="bg-sap-blue hover:bg-sap-blue/90 text-white shadow-lg"
            >
              Confirmar Importación
            </Button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ImportModal;
