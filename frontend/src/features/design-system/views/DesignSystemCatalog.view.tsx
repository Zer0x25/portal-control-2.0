/* eslint-disable no-restricted-syntax --
 * Spec 033 AC1 (allowlist temporal): esta vista todavía tiene hooks y es la
 * entrada de ruta del catálogo de primitivas. La retirada del disable está
 * asignada a la spec 033 T8, que parte el feature en
 * hooks/useDesignSystemCatalog.ts + containers/DesignSystemCatalog.container.tsx
 * + views/DesignSystemCatalog.view.tsx presentacional.
 * El guardrail `viewPurityGuardrails.test.ts` (VIEW_HOOK_BUDGET) impide que
 * la allowlist vuelva a crecer.
 */
import React, { useId, useState } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import Container from "../../../components/ui/Container";
import TabNav from "../../../components/ui/TabNav";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Checkbox from "../../../components/ui/Checkbox";
import Switch from "../../../components/ui/Switch";
import Textarea from "../../../components/ui/Textarea";
import Badge from "../../../components/ui/Badge";
import Card from "../../../components/ui/Card";
import { MetricCard, MetricStat } from "../../../components/ui/MetricCard";
import Skeleton from "../../../components/ui/Skeleton";
import EmptyState from "../../../components/ui/EmptyState";
import ConfirmationModal from "../../../components/ui/ConfirmationModal";
import LoadingSpinner from "../../../components/ui/LoadingSpinner";
import { useToasts } from "../../../hooks/useToasts";
import PrimitiveDoc from "../components/PrimitiveDoc";
import {
  SparklesIcon,
  TableCellsIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  BellIcon,
  ClockIcon,
} from "../../../components/ui/icons/index";

type CatalogSection = "tokens" | "components" | "cards" | "feedback";

const SECTIONS = [
  { id: "tokens", label: "Tokens Semánticos" },
  { id: "components", label: "Formularios & Botones" },
  { id: "cards", label: "Tarjetas & Analítica" },
  { id: "feedback", label: "Feedback & Diálogos" },
] as const;

/**
 * Catalogo navegable del design system (spec 031 T18 / AC12).
 *
 * Ruta `/design-system` (solo Administrador). Cada primitiva se documenta con
 * sus variantes, estados, uso y notas de accesibilidad.
 */
export const DesignSystemCatalogView: React.FC = () => {
  const { addToast } = useToasts();
  const [activeSection, setActiveSection] = useState<CatalogSection>("tokens");
  const [isTestConfirmOpen, setIsTestConfirmOpen] = useState(false);

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
    <Container className="space-y-6">
      <PageHeader
        title="Design System"
        subtitle="Catálogo navegable de primitivas, tokens y patrones del Portal Control"
        icon={<SparklesIcon className="w-5 h-5" />}
        eyebrow="Design System"
        eyebrowIcon={<SparklesIcon className="w-3.5 h-3.5" />}
      />

      <TabNav
        tabs={SECTIONS.map((section) => ({ id: section.id, label: section.label }))}
        activeTab={activeSection}
        onTabChange={(id) => setActiveSection(id as CatalogSection)}
        ariaLabel="Secciones del catálogo del design system"
      />

      {activeSection === "tokens" && (
        <div className="space-y-6">
          <PrimitiveDoc
            name="Tokens de superficie"
            path="src/index.css → --surface-*"
            usage="Las superficies definen el plano de fondo de la app; nunca se usan colores crudos para superficies."
            variants={[
              "surface-app",
              "surface-card",
              "surface-header",
              "surface-sidebar",
              "surface-hover",
              "surface-active",
              "surface-stripe",
              "surface-technical",
            ]}
            a11y="Los pares texto/fondo mantienen contraste AA verificado por statusTokensContrast.test.ts."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["surface-app", "Lienzo Global", "bg-token-surface-app"],
              ["surface-card", "Contenedores", "bg-token-surface-card"],
              ["surface-header", "Cabeceras", "bg-token-surface-header"],
              ["surface-sidebar", "Navegación", "bg-token-surface-sidebar"],
              ["surface-hover", "Interacción Hover", "bg-token-surface-hover"],
              ["surface-active", "Estado Activo", "bg-token-surface-active"],
              ["surface-stripe", "Filas Alternas", "bg-token-surface-stripe"],
              ["surface-technical", "Áreas Técnicas", "bg-token-surface-technical"],
            ].map(([token, label, className]) => (
              <div
                key={token}
                className={`p-3 rounded-lg border border-token-border-technical ${className} space-y-1`}
              >
                <span className="text-xxs font-mono text-token-text-tertiary block">{token}</span>
                <span className="text-xs font-bold text-token-text-primary">{label}</span>
              </div>
            ))}
          </div>

          <PrimitiveDoc
            name="Jerarquía tipográfica"
            path="src/index.css → --text-* / @utility typo-ui-*"
            usage="La jerarquía de texto se compone con las utilidades typo-ui-*; el tamaño micro mínimo es text-xxs (10px)."
            variants={[
              "typo-ui-tab",
              "typo-ui-title",
              "typo-ui-label",
              "typo-ui-badge",
              "typo-ui-meta",
              "typo-ui-caption",
              "text-xxs",
            ]}
            a11y="Contraste AA verificado en claro y oscuro; el guardrail typographyGuardrails.test.ts bloquea tamaños arbitrarios."
          />
          <div className="space-y-2 p-4 rounded-lg bg-token-surface-card border border-token-border-technical">
            <div className="flex items-center justify-between border-b border-token-border-subtle pb-2">
              <span className="text-token-text-primary font-bold text-base">
                text-token-text-primary
              </span>
              <span className="text-xxs font-mono text-token-text-tertiary">#0f172a / #f8fafc</span>
            </div>
            <div className="flex items-center justify-between border-b border-token-border-subtle pb-2">
              <span className="text-token-text-secondary font-medium text-sm">
                text-token-text-secondary
              </span>
              <span className="text-xxs font-mono text-token-text-tertiary">#475569 / #94a3b8</span>
            </div>
            <div className="flex items-center justify-between border-b border-token-border-subtle pb-2">
              <span className="text-token-text-tertiary font-normal text-xs">
                text-token-text-tertiary
              </span>
              <span className="text-xxs font-mono text-token-text-tertiary">#5b6b7f / #7c8da6</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="bg-token-accent-brand text-token-text-onAccent px-3 py-1 rounded text-xs font-bold">
                text-token-text-onAccent (sobre acento o badges sólidos)
              </span>
              <span className="text-xxs font-mono text-token-text-tertiary">#ffffff</span>
            </div>
          </div>

          <PrimitiveDoc
            name="Estados del sistema"
            path="src/index.css → --status-*"
            usage="Los estados semánticos (éxito, error, aviso, info) se usan siempre con sus variantes -surface y -text."
            variants={["status-success", "status-error", "status-warning", "status-info"]}
            a11y="Cada estado expone surface (fondo) y text (foreground AA) para badges e indicadores."
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              ["status-success", "Éxito / Válido", "success"],
              ["status-error", "Error / Crítico", "error"],
              ["status-warning", "Aviso / Pendiente", "warning"],
              ["status-info", "Informativo", "info"],
            ].map(([token, label, tone]) => (
              <div
                key={token}
                className={`p-3 rounded-lg border border-token-status-${tone}/30 bg-token-status-${tone}/10 space-y-1`}
              >
                <span className={`text-xs font-black uppercase text-token-status-${tone}`}>
                  {label}
                </span>
                <span className="text-xxs text-token-text-secondary block">{token}</span>
              </div>
            ))}
          </div>

          <PrimitiveDoc
            name="Estados de jornada"
            path="src/index.css → --status-<estado> / --chart-1..8"
            usage="Los estados del turno (laborando, colación, ausente, vacaciones, permiso especial, anomalía, sin marcaje, completado) y la paleta categórica de data-viz se consumen vía token-status-* y token-chart-*."
            variants={[
              "laborando",
              "colacion",
              "ausente",
              "vacaciones",
              "permiso-especial",
              "anomalia",
              "sin-marcaje",
              "completado",
            ]}
            a11y="Contraste AA calculado desde index.css por statusTokensContrast.test.ts."
          />
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
              <div
                key={index}
                className={`h-10 rounded-md bg-token-chart-${index} flex items-end justify-center pb-1`}
              >
                <span className="text-xxs font-mono text-white mix-blend-difference">
                  chart-{index}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeSection === "components" && (
        <div className="space-y-6">
          <PrimitiveDoc
            name="Button"
            path="src/components/ui/Button.tsx"
            usage="Acción disparadora. La variante comunica jerarquía: una sola acción primaria por pantalla."
            variants={[
              "primary",
              "secondary",
              "success",
              "danger",
              "warning",
              "info",
              "ghost",
              "none",
            ]}
            states={["loading", "disabled"]}
            a11y="El estado loading expone su propio spinner; nunca uses animate-spin inline."
          />
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

          <PrimitiveDoc
            name="Badge"
            path="src/components/ui/Badge.tsx"
            usage="Etiqueta compacta de estado. No interactúa: si necesita acción, usa Button."
            variants={["primary", "secondary", "success", "warning", "danger", "info", "neutral"]}
            states={["showDot", "fontMono", "sm | md"]}
          />
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

          <PrimitiveDoc
            name="Controles de entrada"
            path="src/components/ui/{Input,Select,Textarea,Checkbox,Switch}.tsx"
            usage="Todo control expone label visible y estado de error; el error se anuncia con role=alert."
            states={["default", "error", "disabled"]}
            a11y="Etiquetas asociadas por id; los botones de icono requieren aria-label."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id={inputId}
              label="Campo de Texto Estandarizado"
              placeholder="Escriba algo aquí..."
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                setInputError(
                  e.target.value.length > 0 && e.target.value.length < 3
                    ? "Mínimo 3 caracteres requeridos"
                    : "",
                );
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
                {
                  value: "buenos-aires",
                  label: "Buenos Aires (America/Argentina)",
                },
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
      )}

      {activeSection === "cards" && (
        <div className="space-y-6">
          <PrimitiveDoc
            name="MetricCard"
            path="src/components/ui/MetricCard.tsx"
            usage="Tarjeta de métrica del design system: kind=metric (ficha) o kind=panel (contenedor con MetricStat)."
            variants={["tone: success | accent | warning | danger | neutral"]}
            states={["trend positivo/negativo", "clickable"]}
            a11y="El tono es un union type: no hay parsing de strings en runtime."
          />
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
            <MetricCard kind="panel" title="Distribución Operacional" icon={<ClockIcon />}>
              <MetricStat label="Total Colaboradores" value="48" />
              <MetricStat label="En Turno Activo" value="36" isActive />
              <MetricStat label="En Colación" value="6" />
            </MetricCard>

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

      {activeSection === "feedback" && (
        <div className="space-y-6">
          <PrimitiveDoc
            name="Toasts"
            path="src/hooks/useToasts.ts"
            usage="Feedback efímero para el resultado de una acción; nunca reemplaza un error de formulario."
            variants={["success", "error", "warning", "info"]}
            a11y="La región de toasts es una región viva (aria-live) para lectores de pantalla."
          />
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

          <PrimitiveDoc
            name="CinematicModal / ConfirmationModal"
            path="src/components/ui/{CinematicModal,ConfirmationModal}.tsx"
            usage="CinematicModal es la única implementación legal de overlay de modal (Escape, focus trap, aria-modal, retorno de foco)."
            variants={["maxWidth", "showCloseButton"]}
            a11y="role=dialog con aria-modal y labelledby; el foco queda atrapado dentro del diálogo."
          />
          <Button
            variant="secondary"
            onClick={() => setIsTestConfirmOpen(true)}
            className="w-full sm:w-auto"
          >
            <ExclamationTriangleIcon className="w-4 h-4 mr-2 text-token-status-warning" />
            Abrir Modal de Confirmación de Prueba
          </Button>

          <PrimitiveDoc
            name="Skeleton / LoadingSpinner / EmptyState"
            path="src/components/ui/{Skeleton,LoadingSpinner,EmptyState}.tsx"
            usage="Estados de carga y vacío del catálogo. LoadingSpinner es la única primitiva de spinner."
            variants={[
              "LoadingSpinner: xs | sm | md | lg | xl",
              "variant: default | onAccent | subtle",
            ]}
            a11y="El spinner expone role=status con nombre accesible."
          />
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
      )}

      {isTestConfirmOpen && (
        <ConfirmationModal
          isOpen={isTestConfirmOpen}
          onClose={() => setIsTestConfirmOpen(false)}
          onConfirm={() => {
            addToast("Acción confirmada desde el catálogo", "success");
            setIsTestConfirmOpen(false);
          }}
          title="Prueba de Diálogo"
          message="Este es un diálogo ConfirmationModal utilizando tokens semánticos y soporte accesible de Escape."
          confirmText="Ejecutar"
          confirmVariant="primary"
        />
      )}
    </Container>
  );
};

export default DesignSystemCatalogView;
