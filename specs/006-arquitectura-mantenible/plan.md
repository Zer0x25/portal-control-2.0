# Plan 006: Contratos y extracción incremental

Spec: [spec.md](./spec.md). Constitución: [constitution.md](../constitution.md).
Estado: propuesta técnica, pendiente de validar con el piloto.

## Estrategia

1. Caracterizar la consulta actual y sus efectos, incluyendo los casos ambiguos.
2. Introducir el caso de uso y dependencias pequeñas para consulta, reloj y autosync.
3. Delegar desde la fachada actual y comparar resultados y efectos observables.
4. Añadir guardas de dependencias, trazabilidad y descubrimiento real de tests.
5. Medir el resultado. Ampliar a escrituras solo si el corte reduce acoplamiento.

## Arquitectura objetivo

Propuesta: monolito modular por capacidades de negocio, con separación de
reglas, orquestación y adaptadores donde existan efectos externos.

```text
backend/src/modules/holidays/
  application/     # consultar feriados y coordinar dependencias tipadas
  domain/          # solo reglas puras que la extracción justifique
  infrastructure/  # consultas Prisma, proveedor HTTP y otros efectos
  index.ts         # API pública para consumidores externos al módulo
```

La carpeta de dominio es opcional si el caso de uso no tiene reglas puras
significativas. Evitar capas vacías, repositorios CRUD genéricos o una interfaz
por clase. Crear un puerto al necesitar sustituir una dependencia real.

- Dominio depende de tipos propios y utilidades puras justificadas.
- Aplicación depende de dominio y de contratos de las capacidades que usa.
- Infraestructura implementa esos contratos; concentra Prisma y efectos.
- La composición conecta adaptadores; la fachada mantiene los imports actuales.
- Otros módulos usan la API pública, no archivos internos ni tablas ajenas.
- Durante la transición, el legado puede delegar al nuevo módulo. Las dependencias
  inversas temporales deben nombrarse, tener responsable y tarea de eliminación.

Para el primer corte, el autosync existente puede inyectarse como función desde
la fachada. El nuevo caso de uso no importa el servicio legado; todavía no se
afirma que todo el módulo esté desacoplado.

En frontend, conservar `features/<capacidad>` y el patrón container/view/hooks.
TanStack Query administra estado remoto; Zustand, estado local compartido cuando
aporte valor. Las vistas reciben props y no acceden a servicios. Establecer API
pública por feature y guardas de imports de forma incremental, en otra entrega.

## Contratos e invariantes

- Mantener `/api/holidays` y todas las rutas actuales de feriados.
- Mantener filtros `since`, búsqueda, archivados y paginación.
- Mantener orden descendente por fecha y campos `lastModified`, `syncStatus`, `isDeleted`.
- Preservar autosync y la segunda lectura cuando no hay feriados del año actual.
- Inyectar reloj para pruebas, conservando inicialmente la semántica existente:
  año del host para autosync y fecha de negocio para filtrado. Una unificación
  posterior necesita un requisito explícito y sus pruebas de frontera.
- Preservar los errores del proveedor y los efectos de auditoría/socket.
- Mantener transacciones directas, extensiones de auditoría y orden de efectos;
  no reemplazar el cliente extendido por un cliente Prisma independiente.
- Las reglas puras no leen entorno, red, base de datos ni reloj global.

## Archivos a tocar en la implementación propuesta

| Archivo o ubicación                            | Cambio previsto                                                             |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `backend/src/services/HolidayService.ts`       | Fachada que delega la consulta                                              |
| `backend/src/modules/holidays/`                | Caso de uso, contratos y adaptadores mínimos                                |
| `backend/tests/unit/holidays/`                 | Caracterización y comportamiento del caso de uso                            |
| `backend/tests/unit/holidayController.test.ts` | Compatibilidad del consumidor HTTP                                          |
| `backend/tests/*.test.ts`                      | Guardas para capas y entrada pública del piloto                             |
| `backend/package.json`                         | Incluir explícitamente tests existentes si se decide conservar su ubicación |
| `docs/adr/` y su índice                        | Decisión permanente después de evaluar el piloto                            |

No editar SDK a mano. Si cambia el contrato público, detener la extracción y
separar ese cambio de alcance.

## BDD y TDD

BDD acuerda ejemplos con resultado observable. Automatizarlos con Vitest o
Playwright según la frontera; este piloto empieza con Vitest. No todos los
ejemplos necesitan navegador ni un archivo Gherkin ejecutado por Cucumber.

En legado: primero pruebas de caracterización que pasan sobre el código actual.
En nueva lógica o nueva capacidad arquitectónica: test que falla por el motivo
esperado, implementación mínima y refactor con tests verdes. Un fallo de setup
o de importación accidental no es evidencia de un comportamiento pendiente.

No romper deliberadamente el legado para simular TDD. CI comprueba la suite
final; por sí sola no demuestra que el test se escribió antes del código.

## Riesgos y rollback

Mayor riesgo: omitir efectos implícitos de una lectura, cambiar frontera temporal
o usar un adaptador que pierda auditoría. Cubrirlos antes de delegar.
Revertir el commit de delegación devuelve la ejecución al servicio original;
el piloto no requiere migraciones ni cambios de datos para su rollback.
Retirar la implementación duplicada solo al cerrar la comparación.

## Verificación

Dependencias: `npm ci` en cada paquete si faltan; no generar Prisma salvo necesidad
de cliente o cambio de esquema, y usar `DIRECT_URL` según documentación local.

Pruebas nuevas: ejecutar rutas exactas con `npx vitest run` dentro de backend.
T1 ejecutó explícitamente `tests/services/HolidayService.test.ts` en la baseline
y trasladó ese archivo a `tests/unit/holidayService.sync.test.ts`, conservando
sus seis pruebas. La selección habitual de coverage/unit ahora lo incluye.

Antes de cerrar una implementación:

1. Backend: `npm run validate:ci` y `npm run test:coverage`.
2. Frontend, después del backend: `npm run validate:ci:coverage`.
3. Raíz: `npm run spec:check` y `npm run docs:check`.
4. Integración relevante con BD de test y e2e en staging si cambia composición HTTP;
   usar siempre `--env-file .env.staging` para levantar ese entorno.

Nunca ejecutar validaciones backend/frontend en paralelo: `check:sdk` escribe
el SDK del frontend. No rebajar ratchets para acomodar la extracción.
