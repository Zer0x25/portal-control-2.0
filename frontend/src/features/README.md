# Frontend Features Architecture

## Arquitectura de features

- Arquitectura por dominio en `src/features/<feature>`.
- Cada feature separa composición (`containers`), presentación (`views`) y reglas (`hooks`).
- `App.tsx` y las vistas con secciones lazy cargan los `containers` directamente.
- `pages/` solo existe cuando agrega routing o lógica de entrada que el container no cubre; los wrappers de containers van directamente en `containers/`.

## Estructura recomendada por feature

```txt
src/features/<feature>/
  components/   # piezas de UI internas del dominio
  containers/   # composición de hooks, efectos y vistas
  views/        # presentación pura recibida por props
  hooks/        # datos del feature y controladores de UI
  pages/        # opcional, solo si aporta routing o composición real de entrada
  index.ts      # API pública del feature (opcional)
```

## Reglas de decisión

1. Si una página solo reexporta o monta un container, importar el container directamente; `pages/` queda para routing/composición real.
2. Las `views` reciben datos y callbacks por props. No usan estado, queries, permisos, navegación ni servicios.
3. Los `containers` conectan hooks con vistas y mantienen una sola raíz JSX.
4. Los servicios se llaman desde hooks de dominio; las vistas no importan servicios ni clientes HTTP.
5. Los hooks remotos se llaman `use*Data`; la orquestación y el estado de UI se llaman `use*Controller`.
6. Controllers del shell global van en `src/hooks/layout`; las reglas de dominio quedan en el feature.

## Ubicación del estado

| Estado                                                              | Hogar                                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Colecciones, consultas y mutaciones remotas                         | TanStack Query mediante hooks `use*Data` o hooks de queries compartidos |
| Modal abierto, tab activa, menú, filtros y borradores de formulario | `useState` o `use*Controller` del feature que presenta la interfaz      |
| Sesión y señal `mustChangePassword`                                 | `authSlice.currentUser`                                                 |
| Tema, toasts y progreso/cola de sincronización                      | Zustand, porque cruza rutas o representa proceso global                 |
| Señal `hasUnreadNotes`                                              | Zustand; la comparten el evento WebSocket y el widget de herramientas   |
| Offset del reloj de servidor                                        | Zustand; lo consumen varias rutas                                       |

Los slices globales no contienen flags de apertura de modales ni estado efímero de vistas.

## Integración con App Router

- Preferir imports lazy desde `containers`.
- Si el container exporta nombrado, usar:

```ts
const FeaturePage = React.lazy(() =>
  import("./features/foo/containers/Foo.container").then((m) => ({
    default: m.FooContainer,
  })),
);
```

## Checklist de PR

- `npm --prefix frontend run check`
- `npm --prefix frontend run lint`
- `npm --prefix frontend run test:run`
- Validar que no se reintroduzcan wrappers `pages` sin valor.

## Notas

- `auth/LoginPage` permanece como entrada con routing y lógica de acceso.
