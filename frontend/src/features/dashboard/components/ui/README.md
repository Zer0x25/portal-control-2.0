# Dashboard Components - Fase 4

Esta carpeta contiene componentes reutilizables del dashboard con props tipadas y mejores prácticas de desarrollo.

## 📁 Estructura

```
components/
├── ui/                          # Componentes reutilizables
│   ├── index.ts                # Exportaciones centralizadas
│   ├── WidgetContainer.tsx     # Contenedor genérico para widgets
│   ├── ActionButton.tsx        # Botón de acción reutilizable
│   ├── StatusCard.tsx          # Tarjetas de estado
│   ├── MetricGrid.tsx          # Grilla de métricas
│   └── DashboardRow.tsx        # Fila mejorada del dashboard
└── [componentes específicos]   # Componentes del dashboard
```

## 🎯 Componentes Reutilizables

### WidgetContainer

Contenedor genérico para widgets con soporte para loading, error states y animaciones.

```tsx
<WidgetContainer title="Mi Widget" isLoading={false} error={null}>
  <div>Contenido del widget</div>
</WidgetContainer>
```

**Props:**

- `title: string` - Título del widget
- `children: ReactNode` - Contenido del widget
- `isLoading?: boolean` - Estado de carga
- `error?: string | null` - Mensaje de error
- `className?: string` - Clases CSS adicionales

### ActionButton

Botón de acción reutilizable que soporta tanto clicks como enlaces con indicadores de notificación.

```tsx
<ActionButton
  color="emerald"
  icon={ClockIcon}
  label="Horarios"
  onClick={() => navigate('/time')}
/>

// O como enlace
<ActionButton
  color="indigo"
  icon={DocumentIcon}
  label="Reglamento"
  href="/api/configs/public/company-policy/file"
  hasNotification={true}
/>
```

**Props:**

- `color: ColorTheme` - Color del botón
- `icon: IconComponent` - Componente de icono
- `label: string` - Texto del botón
- `onClick?: () => void` - Handler para clicks
- `href?: string` - URL para enlaces
- `hasNotification?: boolean` - Indicador de notificación
- `disabled?: boolean` - Estado deshabilitado

### StatusCard

Componente para mostrar estados del usuario o sistema.

```tsx
<StatusCard status={currentStatus} timeText="Desde las 08:00" />
```

**Props:**

- `status: StatusInfo` - Información del estado
- `timeText?: string` - Texto de tiempo adicional
- `showAnimation?: boolean` - Habilitar animaciones

### MetricGrid

Grilla responsiva para mostrar métricas con animaciones escalonadas.

```tsx
const metrics = useTeamMetrics(present, total, anomalies, onClick, onClick);

<MetricGrid metrics={metrics} columns={3} showAnimation={true} />;
```

**Props:**

- `metrics: MetricItem[]` - Array de métricas
- `columns?: 1 | 2 | 3 | 4` - Número de columnas
- `gap?: "sm" | "md" | "lg"` - Espaciado entre elementos
- `showAnimation?: boolean` - Animaciones escalonadas

### DashboardRow Mejorada

Versión mejorada de DashboardRow con animaciones y mejor tipado.

```tsx
<DashboardRow
  initial="J"
  title="Juan Pérez"
  subtitle="Operador"
  onDoubleClick={handleClick}
  animationDelay={0.1}
/>
```

## 🔧 Hooks Helpers

### useActionButtonProps

Convierte `ActionConfig` en props para `ActionButton`.

```tsx
const buttonProps = useActionButtonProps(actionConfig);
<ActionButton {...buttonProps} onClick={customHandler} />;
```

### useToolButtonProps

Convierte `ToolConfig` en props para `ActionButton`.

```tsx
const buttonProps = useToolButtonProps(toolConfig);
<ActionButton {...buttonProps} />;
```

### useTeamMetrics

Crea array de métricas para el equipo.

```tsx
const metrics = useTeamMetrics(
  presentCount,
  totalCount,
  anomaliesCount,
  onPresentClick,
  onAnomaliesClick,
);
```

## ✅ Beneficios

1. **Reutilización**: Componentes genéricos que se usan en múltiples lugares
2. **Type Safety**: Props completamente tipadas con nuestros tipos del dashboard
3. **Consistencia**: Estilos y comportamientos uniformes
4. **Mantenibilidad**: Cambios en un componente se propagan automáticamente
5. **Animaciones**: Transiciones suaves y consistentes
6. **Accesibilidad**: Estados de loading, error y disabled apropiados

## 🚀 Mejoras Implementadas

- **QuickActionsPanel**: Ahora usa `ActionButton` y `WidgetContainer`
- **ToolsPanel**: Refactorizado con componentes reutilizables
- **MyStatusPanel**: Usa `StatusCard` y `ShiftStatusCard`
- **TeamStatusPanel**: Implementa `MetricGrid` con animaciones
- **WelcomePanel**: Usa `WelcomeWidgetContainer` especializado

## 📝 Próximos Pasos

La Fase 4 establece una base sólida de componentes reutilizables. Las fases futuras pueden enfocarse en:

- **Fase 5**: Testing completo con tipos
- **Fase 6**: Optimizaciones de performance
- **Fase 7**: Temas y personalización avanzada
