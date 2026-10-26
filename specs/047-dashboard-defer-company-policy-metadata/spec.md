# Spec 047: Dashboard Defer Company Policy Metadata

- Estado: Implementado
- Autor: zer0x
- Fecha: 2026-10-24
- ADR relacionado: N/A

## Problema

Al iniciar el Dashboard, `useToolsController` pide `GET /api/configs/public/company-policy` para descubrir la URL del reglamento. El backend siempre devuelve `/api/configs/public/company-policy/file`, que ya es la ruta de reserva del frontend. Las tres capturas previas de staging registraron esa lectura en 3/3 inicios, con 26–57 ms de duración; en una corrida terminó antes de la marca DOM del contenido principal, aunque este no depende de la metadata.

## Alcance

Dentro:

- Evitar la consulta de metadata del reglamento durante el inicio del Dashboard.
- Mantener el enlace configurado por `VITE_COMPANY_POLICY_URL` y el fallback directo al endpoint público de archivo.
- Registrar mediciones comparables en staging y documentar el límite del resultado.

Fuera (explícito):

- Cambiar las rutas Fastify, el contrato OpenAPI o el comportamiento de descarga del PDF.
- Diferir notas, correcciones o auditoría; las consultas existentes alimentan recordatorios y notificaciones.
- Afirmar una mejora de LCP o del tiempo de render por eliminar una petición posterior al contenido visible.

## Criterios de aceptación

- [x] AC1: Al abrir el Dashboard, no se envía `GET /api/configs/public/company-policy`.
- [x] AC2: La herramienta Reglamento mantiene el enlace configurado por `VITE_COMPANY_POLICY_URL` o, por defecto, `/api/configs/public/company-policy/file`.
- [x] AC3: Tres inicios consecutivos de staging confirman nueve endpoints únicos en vez de diez, sin errores ni duplicados; los tiempos de render se reportan sin atribución causal si sus rangos se solapan.

## Restricciones

Sin cambios de contrato HTTP ni de datos. Mantener compatibilidad con el archivo opcional: el fallback ya apunta a la misma ruta que publica el backend cuando hay reglamento.

## Trazabilidad

- Tests que lo probarán: `frontend/src/tests/features/dashboard/useToolsController.test.ts` y `frontend/e2e/performance.spec.ts`.
- Evidencia: `./evidencia/resultado-2026-10-24.md` y `./evidencia/comparison.json`.
- Docs a actualizar: `../../.jules/bolt.md`.
