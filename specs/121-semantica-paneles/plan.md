# Plan 121: Semántica de paneles

Spec: [spec.md](spec.md).

## Estrategia

1. Auditar shell, vistas y componentes visibles.
2. Añadir pruebas de estructura y estado accesible.
3. Utilizar elementos nativos y documentar la regla transversal.
4. Ejecutar pruebas y verificaciones de documentación y tipos.

## Archivos a tocar

| Archivo                           | Cambio                              |
| --------------------------------- | ----------------------------------- |
| Vistas de dashboard y supervisión | Semántica nativa y estado accesible |
| Pruebas de las vistas             | Contratos semánticos y navegación   |
| ADR 0032                          | Estándar transversal                |

## Contratos afectados

Árbol de accesibilidad del frontend; sin cambios de API, SDK ni base de datos.

## Riesgos y rollback

Los cambios de elementos pueden afectar estilos o selectores; conservar clases y probar. Revertir vistas y pruebas conjuntamente.

## Verificación

Pruebas Vitest focalizadas, `npm run check` en frontend, `npm run spec:check` y `npm run docs:check`.
