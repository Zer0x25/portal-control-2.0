# Spec 110: Alinear el Runtime Node 26.13.0

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-11-03
- ADR relacionado: `docs/adr/0030-node-runtime-2613.md`

## Problema

El repo declara Node 26, pero hay imágenes Docker con Node 24 y la terminal
resuelve Node 24 por el `PATH` global pese a que FNM lee `.nvmrc`. CI y las
imágenes principales flotan en cualquier parche 26, mientras la máquina tiene
26.10.0. `npm run dev` no rechaza estas diferencias.

## Alcance

Dentro:

- Fijar una versión de Node LTS como fuente de verdad para el runtime de la app.
- Alinear FNM, engines, CI, imágenes Docker y arranques locales.
- Fallar temprano cuando el runtime/configuración no coincida.
- Documentar que el runtime interno de las GitHub Actions tiene ciclo propio.

Fuera (explícito):

- Cambiar el runtime interno que GitHub usa para ejecutar sus acciones JavaScript.
- Cambiar dependencias de aplicación o modificar funcionalidad de backend/frontend.

## Criterios de aceptación

- [x] AC1: `.nvmrc`, engines y lockfiles fijan Node 26.13.0 como runtime mínimo; la app local usa exactamente esa versión.
- [x] AC2: todos los Dockerfiles con Node usan la etiqueta `26.13.0-alpine`.
- [x] AC3: todos los `setup-node` de CI, deploy y performance leen `.nvmrc`.
- [x] AC4: `npm run check:node-version` valida el runtime y detecta divergencias entre paquetes, CI y Docker; `npm run dev` lo ejecuta antes de levantar PostgreSQL.
- [x] AC5: FNM selecciona el runtime del proyecto sin que el alias global de Node 24 lo oculte.
- [x] AC6: la documentación distingue Node de la app del runtime Node 24 administrado por GitHub Actions.

## Restricciones

Se conserva el runtime de app en la línea 26 ya elegida en Spec 007. El parche
26.13.0 es LTS al 2026-11-03. La actualización futura de parche debe modificar
`.nvmrc`, engines, imágenes y lockfiles en el mismo cambio. No se alteran
contratos HTTP ni datos.

## Trazabilidad

- Comprobaciones: `npm run check:node-version`, `npm run spec:check`,
  `npm run docs:check` y resolución de `node --version` en un shell nuevo.
- Docs a actualizar: ADR-0030 y nota de vigencia histórica en Spec 001.
