import React, { useId, useState } from "react";
import { useMeterReadings } from "../../../hooks/useMeterReadings";
import { useAuth } from "../../../hooks/useAuth";
import { useToasts } from "../../../hooks/useToasts";
import {
  MeterConfig,
  METER_CATEGORIES,
  METER_UNITS,
  MeterCategory,
  MeterType,
} from "../../../types";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { CloseIcon, PlusCircleIcon, EditIcon, DeleteIcon } from "../../../components/ui/icons";
import { idFactory } from "../../../utils/idFactory";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import SideDrawer from "../../../components/ui/SideDrawer";
import { Z } from "../../../constants/zScale";

interface MeterConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const MeterConfigPanel: React.FC<MeterConfigPanelProps> = ({ isOpen, onClose }) => {
  const titleId = useId();
  const { meterConfigs, updateMeterConfigs } = useMeterReadings();
  const { currentUser } = useAuth();
  const { addToast } = useToasts();

  const [editingConfig, setEditingConfig] = useState<Partial<MeterConfig> | null>(null);
  const [configToDelete, setConfigToDelete] = useState<MeterConfig | null>(null);

  const actor = currentUser?.username || "System";
  const MAX_METERS = 12;

  const handleStartAdd = () => {
    if (meterConfigs.length >= MAX_METERS) {
      addToast(`Límite de ${MAX_METERS} medidores activos alcanzado.`, "error");
      return;
    }
    setEditingConfig({
      id: `new-${idFactory.nanoid(8)}`,
      name: "",
      category: "custom",
      type: "CONSUMPTION",
      unit: "unidades",
    });
  };

  const handleStartEdit = (config: MeterConfig) => {
    setEditingConfig(config);
  };

  const handleCancelEdit = () => {
    setEditingConfig(null);
  };

  const handleFieldChange = <K extends keyof MeterConfig>(field: K, value: MeterConfig[K]) => {
    setEditingConfig((prev) => {
      if (!prev) return null;
      const newState = { ...prev, [field]: value };
      if (field === "category") {
        const categoryValue = value as MeterCategory;
        newState.unit = METER_UNITS[categoryValue][0] || "unidades";
      }
      if (field === "type" && (value === "CONSUMPTION" || value === "INSTANT")) {
        delete newState.maxCapacity;
      }
      return newState;
    });
  };

  const handleSave = async () => {
    if (!editingConfig || !editingConfig.name?.trim()) {
      addToast("El nombre del medidor es requerido.", "warning");
      return;
    }

    const isNew = Boolean(editingConfig.id?.startsWith("new-"));
    let updatedConfigs: MeterConfig[];

    if (isNew) {
      // It's a new config
      if (meterConfigs.length >= MAX_METERS) {
        addToast(`Límite de ${MAX_METERS} medidores activos alcanzado.`, "error");
        return;
      }
      const newConfig: MeterConfig = {
        ...editingConfig,
        id: idFactory.ulid(),
        lastModified: Date.now(),
        syncStatus: "pending",
        isDeleted: false,
      } as MeterConfig;
      updatedConfigs = [...meterConfigs, newConfig];
    } else {
      // It's an existing config
      updatedConfigs = meterConfigs.map((c) =>
        c.id === editingConfig.id
          ? { ...c, ...editingConfig, lastModified: Date.now(), syncStatus: "pending" }
          : c,
      );
    }

    try {
      await updateMeterConfigs(updatedConfigs, actor);
      addToast(isNew ? "Medidor agregado con éxito." : "Medidor actualizado con éxito.", "success");
      setEditingConfig(null);
    } catch {
      addToast("Error al guardar la configuración del medidor.", "error");
    }
  };

  const handleDelete = async () => {
    if (!configToDelete) return;
    const updatedConfigs = meterConfigs.map((c) =>
      c.id === configToDelete.id
        ? { ...c, isDeleted: true, lastModified: Date.now(), syncStatus: "pending" as const }
        : c,
    );
    try {
      await updateMeterConfigs(updatedConfigs, actor);
      addToast("Medidor eliminado con éxito.", "success");
      setConfigToDelete(null);
    } catch {
      addToast("Error al eliminar el medidor.", "error");
    }
  };

  const availableUnits = (() => {
    if (!editingConfig || !editingConfig.category) return [];
    return METER_UNITS[editingConfig.category as MeterCategory] || [];
  })();

  const activeMetersCount = meterConfigs.length;
  const isLimitReached = activeMetersCount >= MAX_METERS;

  return (
    <SideDrawer
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy={titleId}
      maxWidth="max-w-md"
      zClass={Z.dropdown}
      backdropZClass={Z.dropdown}
      backdropClassName="bg-black/50"
      panelClassName="bg-token-surface-card shadow-xl animate-in fade-in slide-in-from-right duration-300"
    >
      <div className="flex flex-col h-full">
        <div className="flex justify-between items-center p-4 border-b border-token-border-subtle shrink-0">
          <h2
            id={titleId}
            className="text-xl font-black text-token-text-primary uppercase tracking-tight italic"
          >
            Configurar Medidores
          </h2>
          <Button
            id="close-meter-config-panel"
            aria-label="Cerrar panel de configuración de medidores"
            onClick={onClose}
            variant="secondary"
            size="sm"
            className="p-1 bg-transparent! hover:bg-token-surface-active!"
          >
            <CloseIcon className="w-5 h-5 text-token-text-secondary" />
          </Button>
        </div>

        <div className="p-4 overflow-y-auto grow">
          {editingConfig ? (
            <div className="p-6 border rounded-md border-token-border-subtle bg-token-surface-stripe space-y-4">
              <Input
                label="Nombre del Medidor"
                value={editingConfig.name || ""}
                onChange={(e) => handleFieldChange("name", e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="meter-category-select"
                    className="block text-[10px] font-black text-token-text-tertiary uppercase tracking-widest mb-1.5"
                  >
                    Categoría
                  </label>
                  <select
                    id="meter-category-select"
                    aria-label="Categoría"
                    value={editingConfig.category}
                    onChange={(e) => handleFieldChange("category", e.target.value as MeterCategory)}
                    className="w-full p-2 border rounded border-token-border-subtle bg-token-surface-card text-token-text-primary text-sm font-bold"
                  >
                    {Object.entries(METER_CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="meter-unit-select"
                    className="block text-[10px] font-black text-token-text-tertiary uppercase tracking-widest mb-1.5"
                  >
                    Unidad
                  </label>
                  <select
                    id="meter-unit-select"
                    aria-label="Unidad"
                    value={editingConfig.unit}
                    onChange={(e) => handleFieldChange("unit", e.target.value)}
                    className="w-full p-2 border rounded border-token-border-subtle bg-token-surface-card text-token-text-primary text-sm font-bold"
                  >
                    {availableUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="meter-type-select"
                  className="block text-[10px] font-black text-token-text-tertiary uppercase tracking-widest mb-1.5"
                >
                  Tipo de Medición
                </label>
                <select
                  id="meter-type-select"
                  aria-label="Tipo de Medición"
                  value={editingConfig.type}
                  onChange={(e) => handleFieldChange("type", e.target.value as MeterType)}
                  className="w-full p-2 border rounded border-token-border-subtle bg-token-surface-card text-token-text-primary text-sm font-bold"
                >
                  <option value="CONSUMPTION">Consumo (Acumulativo)</option>
                  <option value="LEVEL">Nivel (Estanque)</option>
                  <option value="PERCENT">Porcentaje (0-100%)</option>
                  <option value="INSTANT">Instantáneo (Temperatura, etc.)</option>
                </select>
              </div>

              {(editingConfig.type === "LEVEL" || editingConfig.type === "PERCENT") && (
                <Input
                  label={`Capacidad Máxima (${editingConfig.unit})`}
                  type="number"
                  min="0"
                  value={editingConfig.maxCapacity || ""}
                  onChange={(e) => handleFieldChange("maxCapacity", parseFloat(e.target.value))}
                />
              )}

              <div className="flex gap-2">
                <Button
                  id="save-meter-config-btn"
                  aria-label="Guardar medidor"
                  onClick={handleSave}
                  variant="primary"
                  size="sm"
                >
                  Guardar
                </Button>
                <Button
                  id="cancel-meter-config-btn"
                  aria-label="Cancelar edición de medidor"
                  onClick={handleCancelEdit}
                  variant="secondary"
                  size="sm"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button
                id="add-meter-config-btn"
                aria-label="Añadir Nuevo Medidor"
                onClick={handleStartAdd}
                className="w-full flex items-center justify-center gap-2 mb-2 bg-token-accent-brand"
                disabled={isLimitReached}
                title={
                  isLimitReached
                    ? `Límite de ${MAX_METERS} medidores activos alcanzado.`
                    : "Añadir un nuevo medidor"
                }
              >
                <PlusCircleIcon className="w-5 h-5" />
                Añadir Nuevo Medidor
              </Button>
              {isLimitReached && (
                <p className="text-center text-[10px] font-black text-token-status-error-text uppercase tracking-widest mb-4">
                  Límite de {MAX_METERS} medidores activos alcanzado.
                </p>
              )}
            </>
          )}

          <h3 className="text-xs font-black text-token-text-tertiary uppercase tracking-[0.2em] mt-8 mb-4">
            Medidores Existentes ({activeMetersCount}/{MAX_METERS})
          </h3>
          {meterConfigs.length > 0 ? (
            <div className="space-y-2">
              {meterConfigs.map((config) => (
                <div
                  key={config.id}
                  className="p-4 border rounded-md border-token-border-subtle bg-token-surface-stripe flex justify-between items-center group hover:border-token-border-technical transition-colors"
                >
                  <div>
                    <p className="font-black text-token-text-primary uppercase tracking-tight italic">
                      {config.name}
                    </p>
                    <p className="text-[10px] font-black text-token-text-tertiary uppercase tracking-widest mt-1">
                      {METER_CATEGORIES[config.category]} / {config.unit}
                    </p>
                  </div>
                  <div className="space-x-1">
                    <Button
                      id={`edit-meter-${config.id}`}
                      aria-label={`Editar medidor ${config.name}`}
                      onClick={() => handleStartEdit(config)}
                      size="sm"
                      variant="secondary"
                      className="p-1"
                      title="Editar medidor"
                    >
                      <EditIcon className="w-4 h-4" />
                    </Button>
                    <Button
                      id={`delete-meter-${config.id}`}
                      aria-label={`Eliminar medidor ${config.name}`}
                      onClick={() => setConfigToDelete(config)}
                      size="sm"
                      variant="danger"
                      className="p-1"
                      title="Eliminar medidor"
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-token-text-tertiary font-bold text-sm bg-token-surface-stripe rounded-md border border-token-border-subtle uppercase tracking-tight">
              No hay medidores configurados.
            </div>
          )}
        </div>
      </div>
      {configToDelete && (
        <ConfirmationModal
          isOpen={true}
          onClose={() => setConfigToDelete(null)}
          onConfirm={handleDelete}
          title="Confirmar Eliminación"
          message={`¿Eliminar el medidor "${configToDelete.name}"? Esta acción no se puede deshacer.`}
        />
      )}
    </SideDrawer>
  );
};

export default MeterConfigPanel;
