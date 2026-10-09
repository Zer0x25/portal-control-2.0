import React, { useState, useId } from "react";
import CinematicModal from "./CinematicModal";
import Button from "./Button";
import Input from "./Input";
import Select from "./Select";
import Checkbox from "./Checkbox";
import Switch from "./Switch";
import Textarea from "./Textarea";
import Badge from "./Badge";
import Card from "./Card";
import KpiCard, { KpiStat } from "./KpiCard";
import MetricCard from "./MetricCard";
import LoadingSpinner from "./LoadingSpinner";
import Skeleton from "./Skeleton";
import EmptyState from "./EmptyState";
import ConfirmationModal from "./ConfirmationModal";
import { useToasts } from "../../hooks/useToasts";
import {
  SparklesIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BellIcon,
  ClockIcon,
} from "./icons/index";

interface DesignSystemShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ShowcaseTab = "tokens" | "components" | "cards" | "feedback";

export const DesignSystemShowcaseModal: React.FC<DesignSystemShowcaseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { addToast } = useToasts();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>("tokens");
  const [isTestConfirmOpen, setIsTestConfirmOpen] = useState(false);

  // Form states for interactive testing
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState("");
  const [selectValue, setSelectValue] = useState("chile");
  const [checkboxChecked, setCheckboxChecked] = useState(true);
  const [switchChecked, setSwitchChecked] = useState(false);
  const [textareaValue, setTextareaValue] = useState("");

  const inputId = useId();
  const selectId = useId();
  const textareaId = useId();

  return (
    <>
      <CinematicModal
        isOpen={isOpen}
        onClose={onClose}
        maxWidth="max-w-4xl"
        title={
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-token-accent-brand/10 text-token-accent-brand">
              <SparklesIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-black tracking-tight text-token-text-primary">
                Design System Gallery
              </div>
              <div className="text-[10px] font-bold text-token-text-tertiary uppercase tracking-widest">
                Portal Control 2.0 • Living Token Showcase
              </div>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Section Navigation Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-token-border-subtle pb-4">
            <Button
              variant={activeTab === "tokens" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("tokens")}
              className="text-xs font-black uppercase tracking-wider"
            >
              1. Tokens Semánticos
            </Button>
            <Button
              variant={activeTab === "components" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("components")}
              className="text-xs font-black uppercase tracking-wider"
            >
              2. Formularios & Botones
            </Button>
            <Button
              variant={activeTab === "cards" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("cards")}
              className="text-xs font-black uppercase tracking-wider"
            >
              3. Tarjetas & Analítica
            </Button>
            <Button
              variant={activeTab === "feedback" ? "primary" : "ghost"}
              size="sm"
              onClick={() => setActiveTab("feedback")}
              className="text-xs font-black uppercase tracking-wider"
            >
              4. Feedback & Diálogos
            </Button>
          </div>

          {/* TAB 1: TOKENS */}
          {activeTab === "tokens" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Superficies */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">
                  Superficies de Aplicación
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-app space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-app
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">Lienzo Global</span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-card space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-card
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">Contenedores</span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-header space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-header
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">Cabeceras</span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-sidebar space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-sidebar
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">Navegación</span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-hover space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-hover
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">
                      Interacción Hover
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-active space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-active
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">Estado Activo</span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-stripe space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-stripe
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">
                      Filas Alternas
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-border-technical bg-token-surface-technical space-y-1">
                    <span className="text-[10px] font-mono text-token-text-tertiary block">
                      surface-technical
                    </span>
                    <span className="text-xs font-bold text-token-text-primary">
                      Áreas Técnicas
                    </span>
                  </div>
                </div>
              </div>

              {/* Textos y Jerarquía */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">
                  Jerarquía Tipográfica & Contraste
                </h4>
                <div className="space-y-2 p-4 rounded-lg bg-token-surface-card border border-token-border-technical">
                  <div className="flex items-center justify-between border-b border-token-border-subtle pb-2">
                    <span className="text-token-text-primary font-bold text-base">
                      text-token-text-primary
                    </span>
                    <span className="text-[10px] font-mono text-token-text-tertiary">
                      #0f172a / #f8fafc
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-token-border-subtle pb-2">
                    <span className="text-token-text-secondary font-medium text-sm">
                      text-token-text-secondary
                    </span>
                    <span className="text-[10px] font-mono text-token-text-tertiary">
                      #475569 / #94a3b8
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-b border-token-border-subtle pb-2">
                    <span className="text-token-text-tertiary font-normal text-xs">
                      text-token-text-tertiary
                    </span>
                    <span className="text-[10px] font-mono text-token-text-tertiary">
                      #5b6b7f / #7c8da6
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="bg-token-accent-brand text-token-text-onAccent px-3 py-1 rounded text-xs font-bold">
                      text-token-text-onAccent (Sobre color de acento o badges sólidos)
                    </span>
                    <span className="text-[10px] font-mono text-token-text-tertiary">#ffffff</span>
                  </div>
                </div>
              </div>

              {/* Estados Semánticos */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">Estados del Sistema</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg border border-token-status-success/30 bg-token-status-success/10 space-y-1">
                    <span className="text-xs font-black text-token-status-success uppercase">
                      Éxito / Válido
                    </span>
                    <span className="text-[10px] text-token-text-secondary block">
                      status-success
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-status-error/30 bg-token-status-error/10 space-y-1">
                    <span className="text-xs font-black text-token-status-error uppercase">
                      Error / Crítico
                    </span>
                    <span className="text-[10px] text-token-text-secondary block">
                      status-error
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-status-warning/30 bg-token-status-warning/10 space-y-1">
                    <span className="text-xs font-black text-token-status-warning uppercase">
                      Aviso / Pendiente
                    </span>
                    <span className="text-[10px] text-token-text-secondary block">
                      status-warning
                    </span>
                  </div>
                  <div className="p-3 rounded-lg border border-token-status-info/30 bg-token-status-info/10 space-y-1">
                    <span className="text-xs font-black text-token-status-info uppercase">
                      Informativo
                    </span>
                    <span className="text-[10px] text-token-text-secondary block">status-info</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FORMULARIOS & BOTONES */}
          {activeTab === "components" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Botones */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">Variantes de Botón</h4>
                <div className="flex flex-wrap gap-2 items-center">
                  <Button variant="primary">Primary</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="success">Success</Button>
                  <Button variant="danger">Danger</Button>
                  <Button variant="warning">Warning</Button>
                  <Button variant="info">Info</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="primary" loading>
                    Cargando
                  </Button>
                  <Button variant="primary" disabled>
                    Deshabilitado
                  </Button>
                </div>
              </div>

              {/* Badges */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">
                  Etiquetas de Estado (Badges)
                </h4>
                <div className="flex flex-wrap gap-2 items-center">
                  <Badge variant="primary" showDot>
                    Primario
                  </Badge>
                  <Badge variant="success" showDot>
                    Activo
                  </Badge>
                  <Badge variant="warning" showDot>
                    Advertencia
                  </Badge>
                  <Badge variant="danger" showDot>
                    Bloqueado
                  </Badge>
                  <Badge variant="info" showDot>
                    Información
                  </Badge>
                  <Badge variant="neutral">Neutro</Badge>
                  <Badge variant="secondary" fontMono>
                    Mono 12:45
                  </Badge>
                </div>
              </div>

              {/* Form Controls */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">Controles de Entrada</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    id={inputId}
                    label="Campo de Texto Estandarizado"
                    placeholder="Escriba algo aquí..."
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      if (e.target.value.length > 0 && e.target.value.length < 3) {
                        setInputError("Mínimo 3 caracteres requeridos");
                      } else {
                        setInputError("");
                      }
                    }}
                    error={inputError}
                  />

                  <Select
                    id={selectId}
                    label="Selector Desplegable"
                    value={selectValue}
                    onChange={(e) => setSelectValue(e.target.value)}
                    options={[
                      { value: "chile", label: "Santiago (America/Santiago)" },
                      { value: "utc", label: "Tiempo Universal (UTC)" },
                      { value: "buenos-aires", label: "Buenos Aires (America/Argentina)" },
                    ]}
                  />

                  <div className="sm:col-span-2">
                    <Textarea
                      id={textareaId}
                      label="Área de Texto (Comentarios/Justificaciones)"
                      placeholder="Ingrese notas u observaciones analíticas..."
                      value={textareaValue}
                      onChange={(e) => setTextareaValue(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex items-center gap-6 pt-2">
                    <Checkbox
                      checked={checkboxChecked}
                      onChange={(e) => setCheckboxChecked(e.target.checked)}
                      label="Confirmación requerida"
                    />
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <Switch
                        checked={switchChecked}
                        onChange={setSwitchChecked}
                        aria-label="Modo Alta Concurrencia"
                      />
                      <span className="text-xs font-bold text-token-text-secondary">
                        Modo Alta Concurrencia
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TARJETAS & ANALÍTICA */}
          {activeTab === "cards" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <h4 className="typo-ui-title text-token-text-primary">
                Tarjetas de Métricas & Contenedores
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <MetricCard
                  title="Horas Trabajadas Hoy"
                  value="142.5 hrs"
                  trend={{ value: 12.4, isPositive: true }}
                  label="vs. misma semana mes anterior"
                />
                <MetricCard
                  title="Incidentes de Atraso"
                  value="3"
                  trend={{ value: 5.2, isPositive: false }}
                  label="Tasa de puntualidad 97.8%"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <KpiCard title="Distribución Operacional" icon={<ClockIcon />}>
                  <KpiStat label="Total Colaboradores" value="48" />
                  <KpiStat label="En Turno Activo" value="36" isActive />
                  <KpiStat label="En Colación" value="6" />
                </KpiCard>

                <Card className="flex flex-col justify-between">
                  <div>
                    <h5 className="typo-ui-title text-token-text-primary mb-1">
                      Contenedor Base (Card.tsx)
                    </h5>
                    <p className="text-xs text-token-text-secondary leading-relaxed mb-4">
                      Superficie técnica con bordes normalizados y soporte para hover elevable sin
                      motion overhead.
                    </p>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-token-border-subtle">
                    <span className="typo-ui-meta text-token-text-tertiary">Estado Operativo</span>
                    <Badge variant="success" size="sm" showDot>
                      Sincronizado
                    </Badge>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* TAB 4: FEEDBACK & DIÁLOGOS */}
          {activeTab === "feedback" && (
            <div className="space-y-8 animate-in fade-in duration-150">
              {/* Toasts */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">
                  Disparadores de Toasts
                </h4>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() =>
                      addToast("Operación registrada correctamente en PostgreSQL", "success")
                    }
                  >
                    <CheckCircleIcon className="w-4 h-4 mr-1.5" /> Toast Éxito
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => addToast("Error de conexión con el servicio", "error")}
                  >
                    <ExclamationTriangleIcon className="w-4 h-4 mr-1.5" /> Toast Error
                  </Button>
                  <Button
                    variant="warning"
                    size="sm"
                    onClick={() => addToast("Revisar marcas incompletas en la jornada", "warning")}
                  >
                    <BellIcon className="w-4 h-4 mr-1.5" /> Toast Alerta
                  </Button>
                  <Button
                    variant="info"
                    size="sm"
                    onClick={() => addToast("Sincronización en segundo plano iniciada", "info")}
                  >
                    <SparklesIcon className="w-4 h-4 mr-1.5" /> Toast Info
                  </Button>
                </div>
              </div>

              {/* Modales */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">
                  Modales de Confirmación
                </h4>
                <Button
                  variant="secondary"
                  onClick={() => setIsTestConfirmOpen(true)}
                  className="w-full sm:w-auto"
                >
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2 text-token-status-warning" />
                  Abrir Modal de Confirmación de Prueba
                </Button>
              </div>

              {/* Estados de Carga y Vacío */}
              <div>
                <h4 className="typo-ui-title text-token-text-primary mb-3">
                  Carga y Estados Vacíos
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-token-surface-card border border-token-border-technical space-y-3">
                    <span className="typo-ui-label text-token-text-tertiary">
                      Esqueletos de Carga (Skeleton.tsx)
                    </span>
                    <Skeleton className="h-6 w-3/4 rounded" />
                    <Skeleton className="h-4 w-full rounded" />
                    <Skeleton className="h-4 w-5/6 rounded" />
                    <div className="flex items-center gap-2 pt-2">
                      <LoadingSpinner size="sm" />
                      <span className="text-xs text-token-text-tertiary font-mono">
                        Sincronizando lote...
                      </span>
                    </div>
                  </div>

                  <div className="p-4 rounded-lg bg-token-surface-card border border-token-border-technical">
                    <EmptyState
                      icon={<TableCellsIcon />}
                      title="Sin Registros"
                      description="Ejemplo de EmptyState estandarizado."
                      className="py-4"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer note */}
          <div className="pt-4 border-t border-token-border-subtle flex justify-between items-center text-xs text-token-text-tertiary">
            <span>
              Regla Agéntica: <code>.agents/rules/design-system-governance.md</code>
            </span>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cerrar Galería
            </Button>
          </div>
        </div>
      </CinematicModal>

      {/* Test Confirmation Modal */}
      {isTestConfirmOpen && (
        <ConfirmationModal
          isOpen={isTestConfirmOpen}
          onClose={() => setIsTestConfirmOpen(false)}
          onConfirm={() => {
            addToast("Acción confirmada desde el Showcase", "success");
            setIsTestConfirmOpen(false);
          }}
          title="Prueba de Diálogo"
          message="Este es un diálogo ConfirmationModal utilizando tokens semánticos y soporte accesible de Escape."
          confirmText="Ejecutar"
          confirmVariant="primary"
        />
      )}
    </>
  );
};

export default DesignSystemShowcaseModal;
