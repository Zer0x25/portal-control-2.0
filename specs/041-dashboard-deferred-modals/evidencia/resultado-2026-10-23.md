# Dashboard: JavaScript secundario bajo demanda

## Diagnóstico y cambio

El [perfil CDP](profile-summary.json) registra un contexto nuevo por versión con CPU x4, sampling y coverage. El trabajo está repartido entre React, Query y evaluación de módulos; no identifica un único componente cuyo render deba memorizarse. La evidencia concreta para esta iteración es la carga de un formulario cerrado, el visor de reportes y sus exportadores, además de dependencias de Form/Table agrupadas con Query y Workbox.

Se sustituyeron únicamente los imports de la vista Dashboard por wrappers lazy: no se modificaron clases, texto, disposición ni reloj. Los controladores se montan en su primera apertura y permanecen montados después, conservando el borrador. La carga de notas para recordatorios y las señales unread siguen activas independientemente del modal.

El primer split de Form no bastaba: el vendor todavía incluía Table/Virtual, que dependían de Store y volvían a importar Form. Los sourcemaps de diagnóstico local confirmaron esa cadena. Se separó la familia completa de Query, Table/Virtual, Form y sanitización. El resto de rutas conserva sus componentes y funcionalidades.

En el perfil diagnóstico los scripts pasaron de **84 a 76** y su transferencia de **395,823 a 295,737 bytes** (−25.3%). Es una comparación instrumentada de una muestra por versión; los tiempos de CPU/LCP de ese perfil no son un benchmark. Las mediciones de Lighthouse se registran por separado.

## Regresión funcional

- Test Playwright falló antes del cambio al observar ShiftReportModal y exportToPdf en la carga inicial.
- Staging reconstruido pasó apertura de notas, validación vacía sin envío, texto y color conservados al cerrar/reabrir, salida por Escape y restitución del foco.
- El visor de un reporte real del seed abrió y generó la pestaña de impresión, sin crear ni modificar notas o reportes.
- 24 tests enfocados pasaron: wrappers, controladores Dashboard/notas y guards de capas/presentación.
- El guard de la batería espera ahora el reloj de Dashboard, registra las dependencias opcionales y falla si se importan anticipadamente.

## Alcance de red y PWA

El ahorro corresponde a dependencias del documento y al camino de carga inicial. La instalación del service worker sigue precacheando funcionalidades para uso posterior: este cambio no reduce todo el tráfico de instalación ni elimina esas bibliotecas. El [presupuesto del build](build-checks.json) pasa: React core 218,860 bytes, charts 145,613 y precache 2,039,745 de un límite de 2,097,152 bytes. El perfil diagnóstico bloqueó service workers; Lighthouse frío usa el reinicio de storage de la batería existente.

## Comparación Lighthouse

Lote válido: [2026-10-23T15-01-52-304Z](../../039-frontend-performance-battery/evidencia/runs/2026-10-23T15-01-52-304Z-45138318.json). Imagen medida y actualmente desplegada: `sha256:292bc2e70eee55398cc04d7f214eff19ece18ca8ea9b384c887ddf85ea7a803c`. [Comparación completa](comparison.json) con las muestras y las 17 rutas estándar.

Medianas de tres muestras frías por versión, Lighthouse 12.6.1 / Chromium 153, móvil con throttling simulado:

| Métrica                |  Spec 040 |  Spec 041 |    Cambio |
| ---------------------- | --------: | --------: | --------: |
| JavaScript transferido | 409,696 B | 304,922 B |    −25.6% |
| Transferencia total    | 575,671 B | 470,917 B |    −18.2% |
| Solicitudes            |        97 |        89 |     −8.2% |
| FCP                    |  4,383 ms |  3,785 ms |    −13.6% |
| LCP                    |  6,218 ms |  5,508 ms |    −11.4% |
| TBT                    |  229.5 ms |    190 ms |    −17.2% |
| Score                  |        63 |        68 | +5 puntos |
| CLS                    |         0 |         0 |     igual |

LCP anterior: 6,114–6,596 ms; nuevo: 5,463–5,567 ms. FCP también fue menor en las tres muestras nuevas. Es una mejora temporal observada consistente en este laboratorio. TBT tiene rangos superpuestos (213.5–560 frente a 151–239 ms): no afirmar una mejora estable del bloqueo basándose en tres muestras. Estos datos no son Core Web Vitals de usuarios reales ni prueban significancia estadística; la corrección del preparador también cambió el método. Usar este lote como nueva referencia en próximas iteraciones.

Playwright pasó 5/5 con 18 rutas; Lighthouse capturó 17 destinos correctos y 3 Dashboard fríos. Al revisar la salida se detectó que LHCI agrupa por `finalUrl` sin fragmento: aprobaba un único grupo para las 17 rutas HashRouter. Se añadió un gate que agrupa por `finalDisplayedUrl`, sin alterar los originales, y se aplicó a los mismos reportes con la función real del runner: **17 rutas y 85/85 aserciones aprobadas** ([evidencia](per-route-assertions.json)). Dos regresiones impiden que una ruta rápida oculte otra lenta y preservan la agrupación de muestras de una misma ruta. El nuevo gate se ejecutará automáticamente al guardar futuras corridas; el ledger original se conserva sin reescribir.

## Corrección de la captura

El intento `2026-10-23T14-51-41-119Z-45138318` se detuvo porque el guard de Gobernanza observó Dashboard. El preparador visitaba primero la raíz y luego el hash, permitiendo una carrera con la redirección de sesión del login. Ahora siembra sesión y navega directamente al destino. Dos tests Node cubren ese contrato y el rechazo de destinos incorrectos; se ejecutan antes de cada batería. La secuencia real worker → kiosk → governance → dashboard → governance pasó después del ajuste. El intento incompleto se conserva y se excluye de la comparación. Esta corrección del preparador es una diferencia de método que limita la atribución causal de los cambios de tiempo.

## Próximo foco observado

El perfil muestra solicitudes a `employees/kiosk` en una sesión administrativa de Dashboard y una primera ronda de catálogos/configuración de `useScheduling` antes de pedir `kpis/overview`; luego la sincronización invalida parte de esas consultas y las repite. El próximo ciclo debe medir esa cascada y sus consumidores antes de cambiar enabled/sincronización: hay automaciones de login, recordatorios y permisos que deben preservarse.

## Checks finales

TypeScript, lint de ambos paquetes 0/0, formato frontend/scripts, 24 tests enfocados, 4 regresiones Node del harness, build/presupuestos, specs, enlaces y diff sin espacios incorrectos. No se ejecutó CI remota ni toda la suite funcional de negocio.
