# Sistema de Diseño Visual: Proyecto PORTAL

Este documento sirve como la **fuente de la verdad** para la interfaz de usuario del proyecto PORTAL. Su objetivo es garantizar una experiencia de **Herramienta de Software Profesional**, priorizando la **Elegancia Sobria** y la **Eficiencia Operativa**.

---

## 1. Filosofía de Diseño: Elegancia Sobria y Herramienta de Trabajo

A diferencia de una página web comercial, PORTAL se define como un **Sistema de Mando y Control**. La estética busca la **robustez, precisión y durabilidad visual**.

> **La Consigna:** "Herramienta de Software Profesional: Elegancia Sobria y Robusta".
>
> - **Funcionalidad sobre Fantasía:** Los efectos visuales (transparencias, brillos) solo se usan si mejoran la jerarquía de la información.
> - **Entorno de Trabajo:** Tonos cálidos (Bone/Hueso) para reducir la fatiga visual en turnos largos.
> - **Precisión Industrial:** Bordes nítidos, tipografía técnica y espaciado riguroso.

---

## 2. Paleta de Colores (The Pantone)

### 2.1. Colores de Identidad (Brand Colors)

Estos colores representan la base de la marca y se definen en `tailwind.config.js`.

| Token                | Valor Hex | Uso Principal                                    |
| :------------------- | :-------- | :----------------------------------------------- |
| **`sap-blue`**       | `#005792` | Identidad corporativa, acciones primarias.       |
| **`sap-light-blue`** | `#007bff` | Resaltes, hover y estados activos en modo noche. |

### 2.2. Colores Semánticos (Status Colors)

Tokens para retroalimentación semántica del sistema.

| Token             | Valor Hex | Uso Principal                           |
| :---------------- | :-------- | :-------------------------------------- |
| **`sap-success`** | `#10b981` | Notificaciones positivas, ingresos ok.  |
| **`sap-error`**   | `#ef4444` | Alertas críticas, eliminación, errores. |
| **`sap-warning`** | `#f59e0b` | Advertencias, estados pendientes.       |
| **`sap-info`**    | `#0ea5e9` | Información general, notas del sistema. |

### 2.3. Colores de Sistema (Neutros)

Utilizados para fondos, bordes y jerarquía de texto.

| Contexto               | Ligero (Day)                   | Noche (Dark)      |
| :--------------------- | :----------------------------- | :---------------- |
| **Fondo Base**         | `bg-sap-bone` (#F7F4ED)        | `bg-gray-950`     |
| **Bordes**             | `border-black/20`              | `border-white/10` |
| **Texto Primario**     | `text-gray-950` (Legibilidad+) | `text-white`      |
| **Texto Secundario**   | `text-gray-600` (Contraste+)   | `text-gray-400`   |
| **Neutral Secundario** | `bg-gray-100` (Fichas/Cards)   | `bg-gray-900`     |

### 2.4. Gradientes Premium (Signature Styles)

Aplicados a botones de acción principal para dar profundidad y relieve.

- **Azul (Acciones):** `from-sap-blue to-indigo-600` + `shadow-blue-500/30`
- **Verde (Éxito):** `from-emerald-600 to-teal-700` + `shadow-emerald-500/30`
- **Rojo (Alerta/Borrar):** `from-red-600 to-rose-700` + `shadow-red-500/30`

---

## 3. Capas, Formas y Superficies

### 3.1. Superficies y Contenedores

| Elemento               | Clase Tailwind                                        | Descripción                                     |
| :--------------------- | :---------------------------------------------------- | :---------------------------------------------- |
| **Fondo Global**       | `bg-sap-bone`                                         | Tono cálido para todo el viewport.              |
| **Paneles de Control** | `bg-gray-100 dark:bg-gray-900 border border-black/15` | Gris industrial para evitar el deslumbramiento. |
| **Tablas de Gestión**  | `bg-transparent border-separate border-spacing-0`     | Divisores de `1px` para máxima claridad.        |
| **Header / Sidebar**   | `bg-sap-bone dark:bg-gray-950 border-black/10`        | Integración cromática total con el fondo.       |

### 3.2. Acentos Cinematográficos e Indicadores Industriales (The Logic Layer)

Para elevar la calidad visual sin añadir carga cognitiva, se utilizan acentos de "estado activo".

| Elemento                 | Clase Sugerida / Estructura                            | Uso                                                 |
| :----------------------- | :----------------------------------------------------- | :-------------------------------------------------- |
| **Top Cinematic Accent** | `absolute top-0 left-0 w-full h-1 bg-gradient-to-r`    | Borde superior de cards principales (opacidad 50%). |
| **Industrial Indicator** | `w-1.5 h-10 bg-[color] rounded-full shadow-[color]/30` | Sustituye iconos en headers de sección/fichas.      |
| **Active Pulse**         | `w-1.5 h-1.5 rounded-full bg-[color] animate-pulse`    | Indica que un motor o sesión está en ejecución.     |
| **Vertical Indicator**   | `w-1.5 h-full bg-[color] rounded-full`                 | Para items de lista, logs (vía móvil) o jerarquía.  |

### 3.3. Formas (Border Radius)

- **Radio Estándar (Paneles/Cards):** `rounded-lg` (12px) para un look profesional y nítido.
- **Botones y Inputs:** `rounded-md` (8px) para sensación de precisión técnica.
- **Acciones Críticas / Mando**: `rounded` (4px) para máxima sobriedad industrial.
- **Nota**: Evitar radios grandes (`xl`, `2xl`, `3xl`) que restan seriedad a la herramienta.

### 3.3. Elevación y Sombras (Shadow Discipline)

En una herramienta profesional, las sombras deben usarse con extrema moderación para evitar el ruido visual.

- **Regla General**: Evitar sombras en contenedores básicos, tablas y botones secundarios. La separación se logra mediante bordes (`border-black/10`).
- **Uso Permitido**:
  - **Botones Primarios/Críticos**: Sombra pequeña (`shadow-sm` o `shadow-md`) para indicar "pulsa aquí".
  - **Modales y Menús Desplegables**: Sombra profunda (`shadow-2xl`) para separarlos físicamente del plano de trabajo.
  - **NUNCA en Layout**: El Header y el Sidebar no deben tener sombras proyectadas sobre el contenido (usar bordes en su lugar).

### 3.4. Espaciado y Márgenes (Spacing Standard)

| Nivel                | Valor Tailwind | Medida | Uso                                     |
| :------------------- | :------------- | :----- | :-------------------------------------- |
| **Pad Interno Card** | `p-6`          | 24px   | Estándar para el contenido de tarjetas. |
| **Pad Header/Modal** | `p-8`          | 32px   | Encabezados principales y modales.      |
| **Separación Secc.** | `space-y-8`    | 32px   | Entre bloques grandes de contenido.     |
| **Gap de Grilla**    | `gap-4`        | 16px   | Entre elementos pequeños/columnas.      |

---

La legibilidad es la prioridad número uno. Se utiliza un set de fuentes que evocan modernidad y técnica.

- **Sans-Serif (Global):** `Inter` (Google Fonts). Peso base `medium` (500) para evitar que se pierda en el fondo Bone.
- **Monospace (Datos):** `Roboto Mono` (Google Fonts). Para horas, folios, IP y datos numéricos.

| Estilo                 | Clase Sugerida                                              | Regla de Oro                                             |
| :--------------------- | :---------------------------------------------------------- | :------------------------------------------------------- |
| **Títulos de Sección** | `text-xl font-black uppercase text-gray-950`                | Seguidos por un subtítulo descriptivo debajo.            |
| **Subtítulos / Meta**  | `text-[10px] uppercase tracking-widest text-gray-600`       | Ubicados justo debajo del título principal (`mt-1.5`).   |
| **Títulos de Impacto** | `text-4xl font-black uppercase tracking-[0.2em] text-black` | Uso exclusivo en landing pages o dashboards principales. |
| **Datos Mono**         | `font-mono tracking-tighter text-sap-blue`                  | Para fechas, folios y horas.                             |

---

- **Set Estándar:** **Heroicons (Outlined)**.
- **Implementación:** Localizada en `src/components/ui/icons/`.
- **Reglas de Iconos:**
  - **Uso en Botones**: `w-4 h-4` (para mantener la compacidad técnica).
  - **Uso Standalone / Grid**: `w-5 h-5` (estándar de legibilidad).
  - **Uso en Impacto (Dashboards)**: `w-8 h-8` o superior, siempre dentro de un `IconBox`.
  - **Estilo**: No mezclar estilos (Solid vs Outlined). Usar preferentemente **Outlined** para ligereza visual.

### 5.10. IconBox (Contenedor de Iconos Premium)

Componente para enmarcar iconos en secciones de alto impacto o cabeceras de widgets. Garantiza consistencia visual y semántica.

- **Path**: `src/components/ui/IconBox.tsx`
- **Estética**: Fondo con opacidad sutil (`bg-[color]/10`), bordes nítidos (`rounded-xl`) y color de icono a juego.
- **Variantes**:
  - `primary`: Sapphire Blue (Identidad).
  - `success`: Emerald Green (Positivo).
  - `warning`: Amber (Advertencia).
  - `danger`: Red/Rose (Crítico).
  - `neutral`: Gris/Dark (Metadatos).
  - `light`: Blanco traslúcido (Fondos oscuros).
- **Tamaños**:
  - `sm`: Contenedor `w-8 h-8`, Icono `w-4 h-4`.
  - `md`: Contenedor `w-10 h-10`, Icono `w-5 h-5` (Estándar).
  - `lg`: Contenedor `w-16 h-16`, Icono `w-8 h-8` (Dashboards).

---

## 5. Guías de Componentes Específicos

### 5.1. Badge (Indicadores de Estado)

Utilizados para etiquetas pequeñas de metadatos o estados semánticos.

- **Variantes:** `success`, `danger`, `warning`, `info`, `primary`, `neutral`.
- **Propiedades:** `showDot` (pulso animado), `fontMono` (para datos técnicos).
- **Uso:** `<Badge variant="success" fontMono>{licensePlate}</Badge>`

### 5.2. Checkbox (Selector de Precisión)

Diseñado para parecer un interruptor de instrumento técnico.

- **Estética:** `bg-gray-900`, `rounded-sm` (4px), borde definido.
- **Interacción:** El label en uppercase cambia a `sap-blue` al hacer hover.

### 5.3. Select (Selector Industrial)

Sustituye al select nativo con la estética del `Input`.

- **Acento:** Chevron personalizado y hover dinámico.
- **Uso:** Recomendado para listas de opciones de sistema o filtros técnicos.

### 5.4. Switch (Toggle Industrial)

Interruptor binario mecánico.

- **Estética:** Off (`bg-gray-200`) / On (`bg-sap-blue`).
- **Interacción:** Transición suave con sensación táctil.

### 5.5. Tooltip (Micro-Ayuda)

Contexto técnico flotante.

- **Estética:** Fondo `gray-950` con borde `white/10`.
- **Uso:** Explicar acrónimos o iconos sin etiqueta visible.

### 5.6. Header de Control

Diseño sobrio con títulos en negro sólido y peso `font-black`.

### 5.7. EmptyState (Estado Vacío)

Componente unificado para ausencia de datos. Evita la sensación de interfaz "muerta".

- **Estética**: Icono central enmarcado en `IconBox`, borde discontinuo (`border-dashed`), tipografía técnica (`font-black uppercase`).
- **Uso**: Tablas vacías, listas sin resultados, estados de carga inicial sin datos.
- **Path**: `src/components/ui/EmptyState.tsx`

### 5.8. Skeleton (Carga Estructural)

Placeholder de carga pulsante.

- **Estética:** `bg-gray-200` / `dark:bg-gray-800` con `animate-pulse`.
- **Uso:** Evitar saltos de layout durante la carga de datos.

- **Estructura**: `[LOGO] | TITULO SISTEMA (Industrial)`
- **Acción Cierre**: Botón sólido rojo para identificación inmediata de seguridad.

### Cinematic Components

#### `PageHeader`

Standard header for all main pages. Uses high-impact typography and subtle gradients.

- **Path**: `src/components/ui/PageHeader.tsx`
- **Title**: `text-4xl font-black italic` with `bg-gradient-to-r from-sap-blue to-blue-500` (Dark: `from-white to-gray-400`).
- **Subtitle**: `text-[10px] uppercase font-black tracking-[0.3em] text-gray-400`.

#### `TabNav`

Glassmorphic tab navigation with motion pill indicator. Supports badges for notifications/counts.

- **Path**: `src/components/ui/TabNav.tsx`
- **Standard**: Used in Supervisor Dashboard, Personnel, and Theoretical Shifts.

#### `SuperCard`

Extreme cinematic container with ultra-large corners (`rounded-[2.5rem]`) and deep shadows (`shadow-22xl`/`shadow-33xl`).

- **Path**: `src/components/ui/SuperCard.tsx`
- **Standard**: Used for high-impact sections, dashboard main areas, and accounting period controls.

#### `CinematicModal` [NEW]

The unified standard for all modal interactions. Replaces legacy custom modal implementations for consistency and performance.

- **Path**: `src/components/ui/CinematicModal.tsx`
- **Visuals**: Ultra-blurred backdrop (`backdrop-blur-md`), spring-based entry animations, and integrated header structure.
- **Physics**: Uses `framer-motion` spring dynamics for a "physical" feel during entry/exit.

#### `LiveStatus` [NEW]

Real-time system presence indicator. Used to reassure the user of active connectivity and system health.

- **Path**: `src/components/ui/LiveStatus.tsx`
- **Visuals**: Pulsating orbit around a status dot. Green for online, Amber for connecting.
- **Placement**: Logbook Header, Dashboard Welcome Panel.

### Form Components

```tsx
<PageHeader
  title="Gestión de Personal"
  subtitle="Administración centralizada de trabajadores, cuentas y accesos"
/>
```

### Grids and Lists

Standardized data presentation using specialized cards.

- **Header**: Texto `xxs` uppercase con mucho tracking.
- **Filas**: Hover sutil solo para guiar la vista (`bg-black/[0.02]`).

### 5.3. Oracle AI Chat (Asistente de Trabajo)

- Burbujas de texto con fuentes claras.
- Estética de "Consola Inteligente" en lugar de chat recreativo.

### 5.4. Estados Vacíos (Empty States)

Se utilizan cuando no hay datos registrados para evitar una interfaz "muerta".

- **Contenedor**: `py-12` a `py-16`, centrado, con `bg-gray-100/30` o similar.
- **Borde**: `border-2 border-dashed border-gray-200 dark:border-gray-700/50`.
- **Texto**: `italic text-sm text-gray-500` para el mensaje principal.

### 5.5. Reportes PDF

- **Tipografía:** Helvetica.
- **Colores:** Sapphire Blue para títulos, Emerald Green para ingresos.
- **Layout:** Sobrio y legal, optimizado para impresión.

---

## 6. Animaciones (Framer Motion)

Estándares para dar vida a la interfaz:

1.  **Entrada de Pantalla:** `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}`.
2.  **Transiciones de Página (Global):** Deslizamiento horizontal con spring. `initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}`. Persistent headers/sidebar.
3.  **Botones:** `whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}`.
4.  **Cargas:** Órbitas y pulsos suaves.

---

## 7. Guía para Auditoría Visual (Checklist)

Para validar cualquier nueva pantalla:

1.  **¿Legibilidad Nocturna?** ¿Se lee la "letra pequeña" sobre el fondo oscuro? (Mínimo `gray-400`).
2.  **¿Solidificación?** ¿Los elementos superpuestos son lo suficientemente opacos?
3.  **¿Proporción?** ¿Logos e iconos mantienen su aspecto?
4.  **¿Jerarquía?** ¿El botón principal resalta con gradiente?

---

## 8. Elementos por Definir (Roadmap)

- [x] **Gama Semántica Completa:** Éxito, Error, Advertencia e Info tokenizados.
- [x] **Tipografía Corporativa:** Inter y Roboto Mono habilitadas.
- [x] **Íconos:** Heroicons definidos como estándar.
- [x] **Espaciado:** Estándar de `p-6` / `p-8` definido.
- [x] **Acentos Cinematográficos:** Estilo de líneas de gradiente y pulsos estandarizado.
- [x] **Componentes Base (Biblioteca Atómica):** Centralización de `Button`, `Input` y `Card` en `src/components/ui`.
- [x] **Expansión Atómica:** Crear componentes de `Badge`, `Checkbox` y `Select` bajo el mismo estándar.
- [x] **Componentes Avanzados (Fase 3):** `Switch`, `Textarea` y `Tooltip` implementados.
- [x] **Refactorización Global:** Panel de Variables migrado a estética sólida/industrial.
- [x] **Pulido Profesional (Fase 4):** Refactorización de Tablas, Toasts y creación de EmptyState/Skeleton.

---

_Documento consolidado y actualizado - Fecha: 08 de febrero de 2026_
