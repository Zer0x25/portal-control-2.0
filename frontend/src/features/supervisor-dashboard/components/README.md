# 🎯 Supervisor Dashboard Components

Biblioteca completa de componentes reutilizables para el dashboard de supervisor, con tipado fuerte y integración completa con el sistema de permisos.

## 📦 Arquitectura

```
components/
├── index.ts                    # Punto de entrada único
├── SupervisorReusableComponents.tsx  # Componentes básicos
├── SupervisorAdvancedComponents.tsx  # Componentes avanzados
└── types/
    └── components.ts           # Tipos específicos de componentes
```

## 🚀 Uso Rápido

```tsx
import {
  SupervisorCard,
  SupervisorActionButton,
  SupervisorDataTable,
  useSupervisorPermissions,
} from "@/features/supervisor-dashboard/components";

function MySupervisorPage() {
  const { canPerform } = useSupervisorPermissions();

  return (
    <SupervisorCard title="Gestión de Empleados">
      <SupervisorActionButton
        action="manage_employees"
        onClick={handleManage}
        disabled={!canPerform("manage_employees")}
      >
        Gestionar Empleados
      </SupervisorActionButton>
    </SupervisorCard>
  );
}
```

## 🎨 Componentes Básicos

### SupervisorCard

Contenedor principal con título y contenido.

```tsx
<SupervisorCard title="Estadísticas" subtitle="Vista general del rendimiento" variant="elevated">
  {/* Contenido */}
</SupervisorCard>
```

### SupervisorActionButton

Botón con validación automática de permisos.

```tsx
<SupervisorActionButton
  action="approve_overtime"
  variant="primary"
  size="md"
  onClick={handleApprove}
>
  Aprobar Horas Extra
</SupervisorActionButton>
```

### SupervisorDataTable

Tabla de datos con ordenamiento y paginación.

```tsx
<SupervisorDataTable columns={columns} data={employees} sortable onSort={handleSort} />
```

### SupervisorStatusBadge

Indicador de estado con colores consistentes.

```tsx
<SupervisorStatusBadge status="active" size="sm" />
```

## 🔧 Componentes Avanzados

### SupervisorFilterPanel

Panel de filtros con múltiples opciones.

```tsx
<SupervisorFilterPanel
  filters={filters}
  onFilterChange={handleFilterChange}
  onReset={handleReset}
/>
```

### SupervisorSearchBar

Barra de búsqueda con autocompletado.

```tsx
<SupervisorSearchBar
  placeholder="Buscar empleados..."
  onSearch={handleSearch}
  suggestions={employeeNames}
/>
```

### SupervisorStatsCard

Tarjeta de estadísticas con métricas.

```tsx
<SupervisorStatsCard title="Empleados Activos" value={150} trend="+12%" trendDirection="up" />
```

## 🔐 Sistema de Permisos

Todos los componentes están integrados con el sistema de permisos jerárquico:

- **SupervisorRole**: `junior | senior | lead | manager`
- **SupervisorPermissions**: Permisos específicos por rol
- **SupervisorAction**: Acciones permitidas

### Validación Automática

Los componentes como `SupervisorActionButton` y `SupervisorPermissionWrapper` validan permisos automáticamente:

```tsx
<SupervisorPermissionWrapper requiredPermission="manage_reports">
  <SensitiveComponent />
</SupervisorPermissionWrapper>
```

## 🎨 Tema y Estilos

- **Framework**: Tailwind CSS
- **Tema**: Consistente con el design system del proyecto
- **Colores**: Paleta específica para supervisor
- **Espaciado**: Sistema de espaciado consistente

## 📝 Tipado Completo

Todos los componentes tienen props fuertemente tipadas:

```tsx
interface SupervisorCardProps {
  title: string;
  subtitle?: string;
  variant?: SupervisorComponentVariant;
  children: React.ReactNode;
  className?: string;
}
```

## 🧪 Testing

Los componentes incluyen tests unitarios y de integración:

```bash
# Ejecutar tests de componentes
npm run test -- --testPathPattern=supervisor-dashboard/components
```

## 📚 Documentación Adicional

- [README del módulo Supervisor Dashboard](../README.md)
- [Hooks del módulo](../hooks/useSupervisorDashboardTabs.ts)
- [Servicio transversal de supervisor](../../../services/supervisorService.ts)

## 🔄 Próximos Pasos

1. Integrar componentes en páginas existentes
2. Crear tests end-to-end
3. Documentar casos de uso específicos
4. Optimizar rendimiento para grandes datasets
