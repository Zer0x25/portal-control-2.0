# User Management Feature - Arquitectura "Golden Path"

## 📁 `src/features/user-management/` (Estandarización Marzo 2026)

Esta feature está alineada al **Golden Path** (Container/Hook/View), separando de forma explícita la orquestación de negocio y la capa visual.

```
user-management/
├── containers/                    # Orquestadores (React.lazy targets)
│   └── UserManagement.container.tsx
├── views/                         # UI Pura (UI-PROTECTED)
│   └── UserManagement.view.tsx
├── hooks/                         # Lógica de negocio y orquestación
│   └── useUserManagementData.ts   # Hook principal de usuarios
├── components/                    # Componentes específicos de la feature
│   └── UserForm.tsx
├── pages/                         # Bridge de compatibilidad
│   └── UserManagementPage.tsx     # Wrapper hacia el Container
└── index.ts                       # Barrel export
```

## ✅ Estado: Golden Path Completado

- ✅ **Estructura Física**: Se incorporan `/containers`, `/views` y `/hooks`.
- ✅ **Orquestación Centralizada**: Lógica movida a `useUserManagementData.ts`.
- ✅ **UI-PROTECTED**: Vista protegida para evitar regresiones visuales.
- ✅ **Compatibilidad**: `UserManagementPage.tsx` se mantiene como wrapper.
- ✅ **TypeScript & Lint**: Validado con `npm run check` y lint focalizado.

## 🔗 Relaciones y Dependencias

- **App.tsx** → Importa `UserManagementPage.tsx` (compatibilidad mantenida).
- **UserManagementPage.tsx** → Delega en `UserManagementContainer`.
- **UserManagement.container.tsx** → Llama a `useUserManagementData()` y pasa props a la View.
- **UserManagement.view.tsx** → Capa visual pura.

## 🛠️ Guía de Mantenimiento

1. **Lógica de Datos**: editar `hooks/useUserManagementData.ts`.
2. **Interfaz/UI**: editar `views/UserManagement.view.tsx`.
3. **Formularios de usuario**: editar `components/UserForm.tsx`.

> **Nota**: `UserManagement.view.tsx` es **UI-PROTECTED**; cambios estructurales requieren validación de diseño.
