# ADR-0021: Branding por instancia en `SystemConfig` (logo configurable)

- Estado: Propuesto
- Fecha: 2026-10-09
- Autores: zer0x
- Spec: [027-client-logo-config](../../specs/027-client-logo-config/spec.md)

## Contexto

El logo del login estaba hardcodeado en `frontend/src/features/auth/pages/LoginPage.tsx` (import estático de `Mini_Zer0x.jpg`), lo que condiciona cualquier cambio de marca a editar código y redesplegar. El producto requiere que el logo (y su tamaño) sea configurable por cliente sin deploy.

Hallazgos verificados durante la planificación (spec 027):

1. `SystemConfig` (`key` como `@id`) es una tabla global clave-valor **sin columna de tenant/cliente**.
2. No existe ningún modelo `Tenant`/`Client` ni `clientId` en `backend/src`. El despliegue es single-tenant por instancia.
3. El login es una ruta anónima, pero todas las queries de configuración estaban gated por token; solo `GET /api/configs/public/company-policy` es precedente de lectura pública.

## Decisión

1. **Modelo global por instancia (Opción A)**: una única clave `branding_logo` en `SystemConfig`, con valor JSON `{ source: { kind: "upload" | "url", ref }, width, height }`.
2. **Lectura pública, escritura restringida**: `GET /api/configs/public/brand-logo` (+ `/file` para el archivo subido) sin autenticación, espejando el patrón de `company-policy`; la escritura queda tras guard `Administrador` con auditoría `CONFIG_SET` existente.
3. **Validación en el flow del módulo `configs`** (no en el servicio genérico): esquema + rangos 16–512 px con mensajes en español (400), HTTPS obligatorio para URLs y solo PNG/JPG/WebP para subidas (SVG excluido: no se sirve JS embebido sin sanitizador).
4. **Fallback garantizado en el frontend**: el hook público nunca bloquea el login; el componente `BrandLogo` cae al asset empaquetado con sus dimensiones intrínsecas (anti-CLS) si no hay configuración, la lectura falla o la imagen remota no carga.
5. **Multi-tenant real queda fuera**: si el producto lo exige más adelante, requiere tabla/columna propia, migración Prisma y un ADR que supersede esta decisión.

## Alternativas consideradas

1. **Claves prefijadas por cliente (`branding_logo:<clientId>`)**: descartada porque no existe de dónde derivar `clientId` (dominio, env, cabecera) y multiplica claves huérfanas.
2. **Multi-tenant real con tabla `Tenant`**: fuera de alcance: exige migración, `DIRECT_URL`, aislamiento de lectura y una estrategia de resolución de tenant; no la justifica un único logo por instancia.
3. **Solo URL remota sin subida de archivo**: descartada como opción única porque obliga a hospedar el asset fuera del sistema; la subida reutiliza `uploads/brand-logo/` con el mismo endurecimiento que `company-policy`.

## Consecuencias

Positivas:

- Cambio de marca sin deploy de frontend, con auditoría y control de rol.
- Cero cambios de esquema: la clave es aditiva y reversible (`git revert`).
- El login no depende de la red: fallback local inmediato.

Negativas / costos:

- Nuevos endpoints y directorio de uploads (`uploads/brand-logo/`) que el backup/restore debe considerar si se quiere persistir la marca.
- El tamaño configurado no puede validarse contra las dimensiones reales del archivo remoto (se acepta el par ancho/alto declarado en rango).
- El header sigue con logo textual de `APP_TITLE` (fuera de alcance); si más adelante se vuelve imagen, consumirá el mismo componente.
