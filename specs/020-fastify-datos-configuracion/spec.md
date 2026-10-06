# Spec 020: Medidores, notas y configuración

- Estado: Borrador planificado; implementación pendiente
- Fecha: 2026-10-06
- Ruta: [roadmap](../roadmap-fastify.md)

## Problema

La superficie /api/meters, /api/notes, /api/configs debe integrarse al candidato Fastify para completar
la migración modular y disponer de contratos y pruebas mantenibles.

## Alcance

CRUD, lotes, permisos y eventos; conservar límites entre los tres módulos. Inventariar cada ruta real antes de implementar, incluidas las
anidadas. Compartir casos de uso entre los adaptadores cuando corresponda.

Fuera: módulos de otras specs y cambios de producto no declarados. Esta spec
es una previsión; no autoriza despliegues ni operaciones externas.

## Criterios de aceptación

- [ ] AC1: Inventario no vacío con método, path, permisos, validación, respuestas y efectos de cada ruta/flujo.
- [ ] AC2: BDD concreto y pruebas RED antes de implementar; comportamiento vigente y errores caracterizados.
- [ ] AC3: Implementación con puertos tipados, límites públicos y sin dependencias de infraestructura en aplicación.
- [ ] AC4: Paridad verificada con BD aislada donde aplique; contratos de seguridad y fallos comprobados.
- [ ] AC5: Gates backend/frontend secuenciales, docs/SDK y ratchets aprobados; resultado con límites y rollback.

## Restricciones

Constitución I–V, Node 26, React/Vite y PostgreSQL se conservan. Usar
withDirectTransaction para transacciones interactivas. No reducir ratchets.
El cambio de servidor principal se reserva a 025. Para 025, AC3 exige además
retirar dependencias Express una vez demostrado el rollback.

## Trazabilidad

Dependencia prevista: 019; revisar dependencias reales al iniciar.
Tests y archivos concretos se detallarán tras el inventario de AC1.
