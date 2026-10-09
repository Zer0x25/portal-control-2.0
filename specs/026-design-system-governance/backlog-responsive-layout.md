# Roadmap & Backlog: Layout Responsivo, Contenedores Canónicos y Navegación Headless

Spec: [spec.md](spec.md) | Tasks: [tasks.md](tasks.md) | Regla: [.agents/rules/design-system-governance.md](../../.agents/rules/design-system-governance.md)

Este documento centraliza el inventario, estado de avance y plan de tandas para la adopción integral del componente canónico `<Container>`, tokens de layout responsivo (PWA / Safe Areas) y contratos de navegación determinista para agentes headless en `portal-control`.

---

## 1. Estado de la Integración (Fase 1: Cerrada)

- [x] **Tokens PWA & Safe Areas**: Configuración de utilidades semánticas `@utility pt-safe`, `pb-safe`, `pl-safe`, `pr-safe`, `p-safe` en [index.css](../../frontend/src/index.css).
- [x] **Componente Primitivo Canónico**: Implementación de [Container.tsx](../../frontend/src/components/ui/Container.tsx) con soporte para variantes (`standard`, `wide`, `narrow`, `fluid`), `noPadding`, `withSafeArea` y polimorfismo (`as`).
- [x] **Shell Responsivo Global**: Adaptación de [PersistentLayout.view.tsx](../../frontend/src/components/layout/PersistentLayout.view.tsx) con altura dinámica `min-h-dvh h-dvh`, contención `max-w-[1440px] mx-auto` y escala elástica móvil `p-4 sm:p-6 lg:p-8 pb-safe`.
- [x] **Navegación Headless Determinista**: Landmarks semánticos (`role="banner"`, `role="navigation"`, `role="main"`, `role="complementary"`), skip link accesible y atributos `data-testid="nav-item-${slug}"`, `data-nav-to`, `data-nav-active` en [Sidebar.view.tsx](../../frontend/src/components/layout/Sidebar.view.tsx), [SidebarNavItem.tsx](../../frontend/src/components/layout/SidebarNavItem.tsx) y [Header.view.tsx](../../frontend/src/components/layout/Header.view.tsx).
- [x] **Suites de Pruebas & Guardrails**:
  - [ResponsiveLayoutCoverage.spec.tsx](../../frontend/src/tests/components/layout/ResponsiveLayoutCoverage.spec.tsx) (12 tests pasando): branching dual Mobile vs Desktop y verificación de landmarks.
  - [responsiveViewportGuardrails.test.ts](../../frontend/src/tests/guardrails/responsiveViewportGuardrails.test.ts) (3 tests pasando): auditoría de 24 vistas principales y guardrail anti-desborde en 320px (WCAG 1.4.10 Reflow).
- [x] **Certificación en Guardrails**: [Container.tsx](../../frontend/src/components/ui/Container.tsx) registrado en `CERTIFIED_FILES` de [audit-design-system.cjs](../../frontend/scripts/audit-design-system.cjs) y [designSystemGuardrails.test.ts](../../frontend/src/tests/guardrails/designSystemGuardrails.test.ts) (73 archivos certificados, 0 incidencias).
- [x] **Tanda 1 (Core Operativo Migrado)**:
  - [TimeControl.view.tsx](../../frontend/src/features/time-control/views/TimeControl.view.tsx) (`variant="wide"`)
  - [SupervisorDashboard.view.tsx](../../frontend/src/features/supervisor-dashboard/views/SupervisorDashboard.view.tsx) (`variant="wide"`)
  - [Dashboard.view.tsx](../../frontend/src/features/dashboard/views/Dashboard.view.tsx) (`variant="standard"`)
  - [WorkerPortal.view.tsx](../../frontend/src/features/worker-portal/views/WorkerPortal.view.tsx) (`variant="standard"`)

---

## 2. Inventario y Tandas de Vistas para Futuras Sesiones

Las 20 vistas restantes se encuentran organizadas en 4 tandas atómicas para su migración gradual:

### Tanda 2: Módulo de Turnos Teóricos y Planificación (6 vistas) [Completada]
Adecuación para matrices densas de programación mensual y gestión de turnos:
- [x] `src/features/theoretical-shifts/views/TheoreticalShifts.view.tsx` (`variant="wide"`)
- [x] `src/features/theoretical-shifts/views/AssignmentManager.view.tsx` (`variant="wide"`)
- [x] `src/features/theoretical-shifts/views/PatternManager.view.tsx` (`variant="wide"`)
- [x] `src/features/theoretical-shifts/views/HolidayManager.view.tsx` (`variant="wide"`)
- [x] `src/features/theoretical-shifts/views/LeaveManager.view.tsx` (`variant="wide"`)
- [x] `src/features/planning/views/MonthlyPlanning.view.tsx` (`variant="wide"`)

### Tanda 3: Gestión de Personal, Empleados y Usuarios (3 vistas) [Completada]
Listas y formularios con soporte de búsqueda y roles:
- [x] `src/features/employee-management/views/EmployeeManagement.view.tsx` (`variant="wide"`)
- [x] `src/features/user-management/views/UserManagement.view.tsx` (`variant="wide"`)
- [x] `src/features/personnel-management/views/PersonnelManagement.view.tsx` (`variant="wide"`)

### Tanda 4: Gobernanza, Auditoría y Mantenimiento (4 vistas) [Completada]
Consolas técnicas, métricas de seguridad y respaldos:
- [x] `src/features/governance/views/GovernanceHub.view.tsx` (`variant="wide"`)
- [x] `src/features/governance/views/SecurityInsights.view.tsx` (`variant="standard"`)
- [x] `src/features/governance/views/SystemMaintenance.view.tsx` (`variant="standard"`)
- [x] `src/features/governance/views/BackupListModal.view.tsx` (`variant="standard"`)

### Tanda 5: Registro, Medidores, Configuración y Quiosco (7 vistas)
Herramientas secundarias y vistas de pantalla completa:
- [ ] `src/features/shift-calendar/views/ShiftCalendar.view.tsx` (`variant="wide"`)
- [ ] `src/features/logbook/views/Logbook.view.tsx` (`variant="wide"`)
- [ ] `src/features/meters/views/MeterReadings.view.tsx` (`variant="wide"`)
- [ ] `src/features/configuration/views/Configuration.view.tsx` (`variant="standard"`)
- [ ] `src/features/configuration/views/MasterDataExport.view.tsx` (`variant="standard"`)
- [ ] `src/features/configuration/views/EmailCenter.view.tsx` (`variant="standard"`)
- [ ] `src/features/communications/views/Communications.view.tsx` (`variant="standard"`)
- [ ] `src/features/kiosk/views/Kiosk.view.tsx` (`variant="fluid"`)

---

## 3. Protocolo de Ejecución para Nuevas Sesiones

Cualquier agente o colaborador que retome una tanda debe seguir este runbook exacto:

1. **Revisión de Invariantes**:
   - Leer [.agents/rules/design-system-governance.md](../../.agents/rules/design-system-governance.md) (Secciones 1, 2, 6 y 7).
2. **Implementación de Vistas de la Tanda**:
   - Importar `Container` desde `../../../components/ui/Container`.
   - Envolver el elemento raíz:
     ```tsx
     <Container
       variant="wide" // o "standard" / "fluid"
       noPadding
       data-ui-protected
       className="[clases-existentes-de-la-vista]"
     >
       {/* Contenido existente */}
     </Container>
     ```
   - Mantener intacto el encabezado de protección `/* UI-PROTECTED: EDIT ONLY WITH HUMAN APPROVAL */`.
3. **Suite de Validación Preflight**:
   ```bash
   cd frontend
   npm run check
   npm run lint
   npx vitest run src/tests/guardrails/ src/tests/components/layout/ResponsiveLayoutCoverage.spec.tsx
   cd ..
   npm run lint:budget
   npm run docs:check
   ```
4. **Disciplina de Commits**:
   - Un commit por tanda bajo Conventional Commits (sin emojis en el asunto):
     `refactor(ui): adapt theoretical shifts views to canonical Container`
