# Validación de la corrección de release #238

## Diagnóstico

- [Run #238](https://github.com/Zer0x25/portal-control-2.0/actions/runs/42324188376), job `128255606235`.
- Release Please creó v8.38.0 correctamente. Falló `Functional release gate` buscando `gestión de empleados`, título que desapareció al redirigir a Personal/Empleados.
- La agrupación serial dejó ocho casos sin ejecutar. El caso offline falló inicialmente y pasó al reintentarse.
- Inspección del código: `isEmbedded` ocultaba el encabezado y su única acción de alta en escritorio. El botón móvil permanecía disponible.

## Regresiones y validación local

Entorno aislado, Node 26.13.0, PostgreSQL 18.4 en tmpfs, migraciones y seed propios.
Frontend y Fastify compilados en producción, servidos en loopback. No se utilizó
ninguna base de datos de usuario o producción.

- Regresión del botón embebido: falló antes de la reparación; después pasaron los cuatro casos de `EmployeeManagementView.test.tsx`.
- `node --test scripts/release-images.test.cjs`: cinco pruebas aprobadas. Incluye rechazo de propietario, SHA, etiqueta, imagen ausente e ID modificado.
- Prueba real de transporte Docker: tres etiquetas temporales sobre una imagen PostgreSQL local, `record`, `docker save | gzip`, `docker load`, `verify`; mismos IDs después de restaurar. Las etiquetas temporales se eliminaron. Esta prueba valida transporte e identidad, no construye imágenes de aplicación.
- `npm run build` en backend y frontend: aprobados.
- Los nueve casos de negocio: aprobados, sin retries, en 15 segundos.
- Suite funcional completa con configuración CI y un worker: **76/76 aprobados en 3,7 minutos, sin retries**. Incluye el caso offline intermitente del run original.
- Actionlint 1.7.12, binario verificado con SHA256, sin integración ShellCheck: todos los workflows aprobados. El chequeo de estructura confirma dependencia del build, etiquetas estables entre intentos, ausencia de reconstrucción en validación y claves YAML únicas.
- `npm run preflight -- --pr`: aprobado. Incluye **1.027 tests frontend en 195 archivos**, diez tests de schemas backend, sincronización del SDK sin cambios, tipos de ambos paquetes, lint 0/0, secrets, specs y docs.
- Formato frontend y archivos modificados, y alineación Node: aprobados.

## Límites y recuperación

La ejecución local usa Vite preview y Fastify compilados con PostgreSQL aislado.
La transferencia entre runners, permisos de Actions, publicación GHCR y pineo
requieren una ejecución real de CD después del merge y de la versión correctiva.
No se publicaron imágenes, modificaron tags ni ejecutó un despliegue externo.

En futuros fallos transitorios, **Re-run failed jobs** conserva los candidatos
por ID de artefacto durante tres días; si falló solo el pineo, reutiliza el
manifiesto publicado. La corrección del código requiere nueva versión: un rerun
antiguo no incorpora los archivos del PR.
