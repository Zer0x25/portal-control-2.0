# Frontend Features Architecture

## Estado actual (Marzo 2026)

- Arquitectura por dominio en `src/features/<feature>`.
- Patrón `container + view + hooks` aplicado en los módulos principales.
- `App.tsx` consume `containers` directamente en casi todos los features.
- `pages` se mantiene solo donde aporta valor real (ej. `auth/LoginPage`, `kiosk/KioskPage`).

## Estructura recomendada por feature

```txt
src/features/<feature>/
  components/   # UI interna del dominio
  containers/   # orquestación: hooks, side-effects, wiring
  views/        # presentación pura por props
  hooks/        # reglas de negocio/controladores del dominio
  pages/        # opcional, solo si agrega lógica/routing real
  index.ts      # API pública del feature (opcional)
```

## Reglas de decisión

1. Si un archivo solo hace `return <XContainer />`, no debe existir como `page`.
2. Si una vista necesita estado/queries/permiso/routing, mover eso a `container` o `hook`.
3. `views` no deben llamar servicios directamente.
4. Controllers del shell global van en `src/hooks/layout`, nunca lógica de dominio.

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

- `npm --prefix Frontend run check`
- `npm --prefix Frontend run lint`
- `npm --prefix Frontend run test:run`
- Validar que no se reintroduzcan wrappers `pages` sin valor.

## Notas

- `auth/LoginPage` permanece como entrada con lógica propia.
- `kiosk/KioskPage` permanece como compatibilidad mínima (revisable).
