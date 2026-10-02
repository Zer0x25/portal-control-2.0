# Dashboard Types

Este directorio contiene todos los tipos TypeScript específicos del feature de dashboard.

## Estructura

```
types/
├── index.ts           # Barrel export de todos los tipos
├── hooks.ts          # Tipos para hooks del dashboard
├── components.ts     # Props de componentes del dashboard
└── widgets.ts        # Configuración de widgets
```

## Tipos Principales

### Hooks Types (`hooks.ts`)

#### `WelcomeData`

Interface que define los datos retornados por `useWelcomeLogic`:

```typescript
interface WelcomeData {
  weather: WeatherData | null;
  isLoadingWeather: boolean;
  welcomeName: string;
  greeting: string;
}
```

#### `ActionConfig`

Configuración para cada acción rápida:

```typescript
interface ActionConfig {
  id: string;
  label: string;
  icon: IconComponent;
  route: string;
  color: ColorTheme;
}
```

#### `ToolConfig`

Configuración para cada herramienta:

```typescript
interface ToolConfig {
  id: string;
  label: string;
  icon: IconComponent;
  action: string | (() => void);
  color: ColorTheme;
  type: ToolType;
  hasNotification?: boolean;
}
```

#### `StatusInfo` & `StatusType`

Información del estado del usuario y tipos de estado posibles.

#### `TeamStatusData`

Datos del estado del equipo.

### Components Types (`components.ts`)

Interfaces para props de componentes:

- `WelcomeProps`
- `QuickActionsProps`
- `ToolsProps`
- `MyStatusProps`
- `TeamStatusProps`
- `WidgetContainerProps`

### Widgets Types (`widgets.ts`)

Tipos para configuración y gestión de widgets del dashboard.

## Beneficios

1. **Type Safety**: Previene errores en tiempo de desarrollo
2. **IntelliSense**: Mejor autocompletado en IDE
3. **Mantenibilidad**: Cambios de tipos se propagan automáticamente
4. **Documentación**: Los tipos sirven como documentación viva
5. **Reutilización**: Tipos compartidos entre componentes

## Uso

```typescript
import { WelcomeData, ActionConfig, ColorTheme } from '../types';

// En hooks
export const useWelcomeLogic = (): WelcomeData => { ... }

// En componentes
interface MyComponentProps {
  actions: ActionConfig[];
  theme: ColorTheme;
}
```
