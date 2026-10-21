# ADR-0027: Design System Catalog & Token Pipeline — Catálogo externo y tokens generados

- Estado: Propuesto
- Fecha: 2026-10-21
- Autores: zer0x

## Contexto

La spec 031 construyó la **gobernanza** del design system y la cerró 20/20:
tokens de dominio (`status-*`), paleta de data-viz (`chart-1..8`), ratchet
completo de palette crudo, 65 primitivas certificadas, catálogo como ruta
del app y escala z con nombres. Lo que quedó pendiente son las dos piezas
que hacen que un sistema gobernado sea **mantenible por personas distintas
de quien lo escribió**.

1. **El catálogo de primitivas es un artefacto del app, no una herramienta de
   trabajo.** `features/design-system/` tiene **2 ficheros**:
   `components/PrimitiveDoc.tsx` (67 líneas) y
   `views/DesignSystemCatalog.view.tsx` (**517 líneas, 7 hooks**) que además
   **es la entrada de ruta** (`/design-system`, gated a Administrador) y
   **no tiene `containers/` ni `hooks/`**. Es decir: **el catálogo del design
   system es el componente que más viola el estándar de capas del propio
   proyecto** (spec 033). Consecuencias:
   - no se puede documentar una primitiva **en aislamiento** (props
     arbitrarias, estados de error, modo oscuro);
   - no hay playground: cada variante exige editar el catálogo;
   - no hay regresión visual del catálogo;
   - no se puede consumir desde fuera (revisor de PR, diseñador, agente) sin
     levantar backend, autenticarse como Administrador y navegar a una ruta
     hash.

2. **Los tokens no tienen pipeline de diseño → código.** Hay **262 custom
   properties** en `frontend/src/index.css` (65 tokens `token-*` únicos)
   escritas a mano dentro del `@theme` de Tailwind v4. El flujo real es:
   Figma → traducción manual a `index.css` → `audit-design-system.cjs`
   verifica que no haya HEX arbitrarios. **No hay garantía de que el nombre
   del token en Figma sea el del token en el código**, ni de que un token
   nuevo se propague a ambos temas. Con 65 tokens y 262 declaraciones, la
   deriva de nombres es una pregunta abierta.

3. **Conviven 3 vocabularios de color.** ADR-0020 define `token-*` como la
   vía canónica y declara `sap-*` **deprecada**, pero `sap-*` sigue viva con
   **432 usos** en `frontend/src`. Además `token-*` convive con el **palette
   crudo** de Tailwind (**879 usos**, con budget monótono en
   `frontend/design-system-budget.json`: `totalIssuesBudget: 0`,
   `paletteIssuesBudget: 879`, `certifiedPaletteBudget: 173`). Tres
   vocabularios para el mismo concepto.

4. **El scorecard del audit es solo estático.** `audit-design-system.cjs`
   produce un compliance score por módulo (hoy: `supervisor-dashboard` 65%,
   `governance` 61%, `logbook` 50%, `notifications` 50%, `constants` 50%)
   a partir del **análisis de clases**. Mide "usa tokens canónicos", pero
   **no mide "se ve bien"**: un token mal aplicado (contraste bajo, jerarquía
   rota) pasa el audit.

5. **No hay ratchet de tokens huérfanos.** Nada impide que `@theme` acumule
   tokens que nadie usa: son deuda que nadie ve porque no aparece en ningún
   consumo.

## Decisión

1. **El catálogo de primitivas se externaliza a Storybook 9** (tooling de
   desarrollo, no runtime). Una historia por cada una de las **65**
   primitivas de `frontend/design-system-certified.json`, con variantes,
   estados, playground de props y render en claro/oscuro. La lista de 65
   **sigue siendo la fuente de verdad única**: la consumen el audit script,
   el guardrail y el catálogo — no hay una lista paralela que mantener.
   **El catálogo dentro del app se conserva** (es la vista de negocio para el
   Administrador) pero **delega** la documentación.

2. **Los tokens tienen fuente de verdad declarativa.** `frontend/tokens.json`
   es la fuente de verdad de los tokens semánticos (`token-*`), de los
   estados de dominio (`status-*`) y de la paleta de data-viz (`chart-1..8`),
   con sus variantes light/dark. `frontend/scripts/build-tokens.cjs` genera
   el bloque correspondiente de `frontend/src/index.css` (delimitado por
   marcadores) y los tipos de TS. El formato del JSON es un **contrato**:
   cualquier productor (Tokens Studio para Figma u otro) puede escribirlo.

3. **El CSS generado se verifica en CI.** El generador tiene un modo
   `--check` que **falla si el CSS commiteado no coincide con el generado**,
   y se integra en `npm run validate:ci` del frontend. Es el mismo patrón que
   `prettier --check` pero para tokens.

4. **La familia `sap-*` se retira.** Los 432 usos migran a `token-*` o a los
   tokens de estado de dominio, con un **mapa de equivalencias** revisado en
   el PR. El ratchet de `sap-*` queda en **0** y bloqueado para siempre.

5. **Cada token tiene consumidor o desaparece.** El audit cruza los tokens
   declarados con sus consumidores reales y reporta los **huérfanos**, con un
   **budget decreciente** (patrón de `design-system-budget.json`).

6. **El scorecard estático se completa con evidencia visual.** El reporte del
   audit incorpora el resultado de la regresión visual de las primitivas
   junto al scorecard por módulo, manteniendo el formato tabular actual.

## Alternativas consideradas

1. **Storybook como sustituto del catálogo del app** — descartada: el
   catálogo del app cumple una función de negocio (quién puede ver qué
   primitivas existen) y el usuario final lo necesita. Se **conserva** y se
   le delega la documentación. Eliminarlo quitaría una ruta del producto.
2. **Ladle en vez de Storybook** — alternativa equivalente y **más ligera**
   (Vite native, sin webpack). Se deja la decisión al primer PR de la Fase D:
   la frontera de la spec es "un catálogo headless con historias", y ambos
   la cumplen. La diferencia real (Storybook tiene ecosistema y addon de
   a11y maduro) favorece Storybook como opción por defecto.
3. **Dejar los tokens escritos a mano en `index.css`** — descartada: es el
   estado actual. Con 65 tokens y 262 declaraciones, la traducción manual
   entre Figma y el código es una fuente de deriva silenciosa, y nada la
   detecta.
4. **Migrar todo el CSS a un formato de tokens de terceros (Style Dictionary
   con JSON + filtros)** — alternativa considerada: Style Dictionary es más
   potente (referencias, transforms, formatos múltiples). Se descarta por
   ahora porque añade una cadena de herramientas con ficheros de
   configuración intermedios para un caso de uso que un script de ~150
   líneas resuelve; si el catálogo de tokens crece (multi-tema, multi-marca,
   export a iOS/Android), la decisión se revisa.
5. **Integrar Figma automáticamente (Tokens Studio o Figma API) como
   fuente de verdad** — descartada por ahora: requiere credenciales de Figma
   en CI y una dependencia externa en el loop de build. La decisión
   deliberada es que `tokens.json` sea un **contrato de formato**, y que la
   integración de Figma sea **un productor más** de ese fichero, no una
   dependencia del pipeline.
6. **Retirar la regresión visual del design system** — descartada: es
   precisamente lo que cierra el bucle que el audit estático no puede
   cerrar ("usa el token correcto" ≠ "se ve bien").
7. **Eliminar los tokens huérfanos sin ratchet** — descartada: sin un
   contador explícito, la limpieza se hace una vez y vuelve a acumularse. El
   ratchet es lo que la mantiene.

## Consecuencias

Positivas:

- **Una primitiva se documenta en aislamiento**, con estados y variantes,
  sin levantar el backend ni autenticarse: baja la barrera para que un
  revisor o un diseñador verifique el design system.
- **El nombre del token en el código y en el diseño dejan de divergir**: el
  JSON es el contrato, y el CI verifica que el CSS commiteado es el
  generado.
- **Un token sin consumidor se detecta**: el design system deja de acumular
  deuda invisible.
- **El `sap-*` desaparece**: queda un solo vocabulario de color.
- El scorecard deja de ser **solo** estático: el diff visual de las
  primitivas acompaña al diff de clases.
- **ADR-0020 no se deroga**: Storybook es documentación y playground, no un
  runtime de componentes.

Negativas / costos aceptados:

- **65 historias** son un trabajo real de creación. Se acepta el trabajo
  con un budget de cobertura **decreciente** (el guardrail exige cobertura
  progresiva, no las 65 de golpe).
- **Un paso de generación** en el loop: un token nuevo requiere tocar el
  JSON y regenerar, no solo el CSS. El modo `--check` convierte el olvido en
  un fallo de CI, no en una deriva silenciosa.
- **Storybook es una dependencia de desarrollo** considerable (instalación y
  build). El build de Storybook pasa a formar parte del pipeline, lo que
  añade tiempo de CI.
- **La regresión visual de primitivas puede generar falsos positivos** por
  antialiasing: se mitiga con `maxDiffPixelRatio` e imagen base fijada.
- **La migración de `sap-*` (432 usos) es mecánica pero **huele** a un cambio
  visual si alguna equivalencia no es exacta: por eso el mapa de
  equivalencias se revisa por área y con comparación en claro/oscuro.
- `tokens.json` **no cubre** el resto de `index.css` (breakpoints,
  utilidades custom, media queries): siguen escritos a mano. La generización
  total del CSS es un objetivo mayor que esta spec no asume.

## Referencias

- `frontend/src/features/design-system/views/DesignSystemCatalog.view.tsx`
  (517 líneas, 7 hooks, entrada de ruta) — el catálogo que se externaliza.
- `frontend/src/features/design-system/components/PrimitiveDoc.tsx` (67) — la
  documentación actual de una primitiva.
- `frontend/design-system-certified.json` — las **65** primitivas
  certificadas (fuente de verdad única).
- `frontend/design-system-budget.json` — los budgets monótonos que esta spec
  extiende (`sapTokenBudget`, `orphanTokenBudget`) con la versión 2 → 3.
- `frontend/scripts/audit-design-system.cjs` — el scorecard por módulo que
  se amplía con la evidencia visual.
- `frontend/src/index.css` — los **262** custom properties, **65** tokens
  `token-*` únicos, el bloque `@theme` que pasa a ser parcialmente generado.
- `frontend/src/components/ui/` — las 65 primitivas certificadas.
- `.agents/rules/design-system-governance.md` §7 (paridad de archivos
  certificados) y §8 (envoltorio canónico) — las reglas que esta spec
  actualiza.
- [spec 038](file:///specs/038-design-system-catalog-pipeline/spec.md) —
  implementación, AC y plan.
- [spec 035](file:///specs/035-frontend-testing-stack/spec.md) — la
  regresión visual que esta spec reutiliza.
- [ADR-0020](0020-design-system-governance.md) — la gobernanza que esta spec
  **extiende**, sin derogar.
- [ADR-0022](0022-ui-ux-consolidation.md) — la consolidación de superficie
  UI y estado remoto.
