# TimeControl Feature - Arquitectura "Golden Path"

## 📁 `src/features/time-control/` (Estandarización Marzo 2026)

Esta feature ha sido totalmente alineada al **Golden Path** (Container/Hook/View), garantizando una separación física y lógica perfecta.

```
time-control/
├── containers/                   # Orquestadores (React.lazy targets)
│   └── TimeControl.container.tsx # Container minimalista (Golden Path)
├── views/                        # UI Pura (UI-PROTECTED)
│   └── TimeControl.view.tsx      # Presentación pura (UI-PROTECTED)
├── hooks/                        # Lógica de negocio y orquestación
│   ├── useTimeControlData.ts     # Hook principal de orquestación (Centraliza todo)
│   ├── useTimeControl.ts         # Hook de estado de filtros y records
│   ├── useClockingPanel.ts       # Lógica del panel de marcaje (Optimizado)
│   └── useTimeControlModals.ts   # Gestión coordinada de modales
├── components/                   # Componentes específicos memoizados
└── tests/                        # Tests específicos de la feature
```

## ✅ Estado: Golden Path Completado

- ✅ **Estructura Física**: Carpetas `/containers` y `/views` estandarizadas.
- ✅ **Orquestación Centralizada**: Lógica movida de Container a `useTimeControlData.ts`.
- ✅ **ClockingPanel Optimizado**: Feedback visual inmediato y búsqueda de empleados corregida.
- ✅ **UI-PROTECTED**: View marcada para gobernanza y prevención de regresiones visuales.
- ✅ **TypeScript & Lint**: 100% Type-safe, validado con `npm run check`.

## 🔗 Relaciones y Dependencias

- **App.tsx** → Importa dinámicamente el `TimeControlContainer`.
- **TimeControl.container.tsx** → Llama a `useTimeControlData()` e inyecta props a la View.
- **useTimeControlData.ts** → Punto único de verdad para datos, acciones y configuración.
- **TimeControl.view.tsx** → Capa visual pura (data-ui-protected).

## 📋 Checklist de Mejora Continua

- [x] Estructura de carpetas alineada con estándares
- [x] Separación Container/View completada
- [x] Fix de bug visual en selección de empleados
- [x] Optimización de performance (memoización básica)
- [x] Validación integral del proyecto
- [ ] Refuerzo de Type Guards en transformaciones de registros
- [ ] Implementación de Error Boundaries específicos por sección
- [ ] Centralización de estilos en DESIGN_SYSTEM.md

## 🛠️ Guía de Mantenimiento

Para realizar cambios en esta feature, identifique el área de impacto:

1. **Lógica de Datos**: Editar `TimeControl.container.tsx` o hooks asociados.
2. **Interfaz/UI**: Editar componentes en `components/` o `TimeControl.view.tsx`.
3. **Flujos de Marcaje**: Editar `useClockingPanel.ts`.

> **Nota**: `TimeControl.view.tsx` es un archivo **UI-PROTECTED**. Cualquier cambio estructural requiere validación contra el sistema de diseño.
