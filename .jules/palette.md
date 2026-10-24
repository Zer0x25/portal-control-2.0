## 2023-10-24 - Missing ARIA labels in Logbook UI components
**Learning:** Found multiple icon-only action buttons (edit, delete, add) in the Logbook module (`LogEntriesCard`, `SupplierEntriesCard`, and FAB menu) lacking `aria-label` attributes, relying only on visual icons.
**Action:** Always ensure `aria-label` is applied to icon-only interactive elements to provide screen reader support, even if `title` tooltips are eventually added. Use Spanish labels (`Editar`, `Eliminar`, `Agregar Proveedor`, etc.) consistently across the application.
