import { RowInput } from "jspdf-autotable";

interface LogEntry {
  time: string;
  annotation: string;
}

interface SupplierEntry {
  time: string;
  company: string;
  driverName?: string;
  reason: string;
  licensePlate: string;
  paxCount?: number;
}

interface ShiftReport {
  folio: string;
  date: string | Date;
  shiftName: string;
  logEntries: string | LogEntry[];
  supplierEntries: string | SupplierEntry[];
}

/**
 * Enterprise Studio HTML Print Helper
 * Sets up a professional print environment within a new tab.
 */
const escapeHtml = (unsafe: string) => {
  if (typeof unsafe !== "string") return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const openHtmlPrintTab = (contentHtml: string) => {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Por favor habilite las ventanas emergentes.");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(contentHtml);
  printWindow.document.close();
};

const getBaseStyles = () => `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
  
  @media print {
    @page { size: A4 landscape; margin: 15px; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background-color: white !important; }
    #print-toolbar { display: none !important; }
    .content-wrapper { box-shadow: none !important; border: 1px solid #e2e8f0 !important; }
  }
  
  body { 
    font-family: 'Inter', sans-serif; 
    line-height: 1.2; 
    color: #1e293b; 
    background-color: #f0f2f5; /* Industrial Gray */
    margin: 0;
    padding: 0;
  }

  #print-toolbar {
    background: #fdfbf7; /* Bone Surface */
    border-bottom: 3px solid #1e293b;
    padding: 12px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: sticky;
    top: 0;
    z-index: 1000;
    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
  }

  .logo-area {
    display: flex;
    flex-direction: column;
  }

  .logo-main {
    font-weight: 900;
    font-size: 14px;
    letter-spacing: -0.05em;
    color: #0f172a;
    text-transform: uppercase;
  }

  .logo-sub {
    font-size: 9px;
    font-weight: 700;
    color: #6366f1;
    text-transform: uppercase;
    letter-spacing: 0.2em;
  }

  .print-btn {
    background: #1e293b;
    color: #fdfbf7;
    border: none;
    padding: 8px 20px;
    border-radius: 4px;
    font-weight: 800;
    text-transform: uppercase;
    font-size: 10px;
    cursor: pointer;
    letter-spacing: 0.1em;
    transition: all 0.2s;
  }

  .content-wrapper { 
    padding: 40px; 
    max-width: 1200px; 
    margin: 30px auto; 
    background: #fdfbf7; /* Bone Surface */
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border: 1px solid #e2e8f0;
    min-height: 100vh;
  }

  .report-header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; }
  .report-header h1 { color: #1e293b; font-size: 24px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em; }
  .report-header h2 { font-size: 16px; margin: 10px 0 0 0; color: #64748b; font-weight: 600; }
  .meta-info { font-size: 11px; color: #94a3b8; margin-top: 15px; font-weight: 500; }
  
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
  th { background-color: #1e293b; color: #fdfbf7; padding: 12px; text-align: left; text-transform: uppercase; font-weight: 800; letter-spacing: 0.05em; }
  td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-weight: 500; }
  tr:nth-child(even) { background-color: #f8fafc; }
`;

export const exportToPDF = (
  title: string,
  headers: string[],
  rows: RowInput[],
  filters?: string,
  _config?: unknown,
) => {
  const tableHtml = `
    <table>
      <thead>
        <tr>${headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("")}</tr>
      </thead>
      <tbody>
        ${(rows as RowInput[][])
          .map(
            (row) => `
          <tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>
        `,
          )
          .join("")}
      </tbody>
    </table>
  `;

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${title}</title>
      <style>${getBaseStyles()}</style>
    </head>
    <body>
      <div id="print-toolbar">
        <div class="logo-area">
          <div class="logo-main">PORTAL ENTERPRISE</div>
          <div class="logo-sub">Studio | Preview</div>
        </div>
        <button class="print-btn" onclick="window.print()">Confirmar Impresión</button>
      </div>
      <div class="content-wrapper">
        <div class="report-header">
          <h1>${escapeHtml(title)}</h1>
          <div class="meta-info">
            ${filters ? `Filtros: ${escapeHtml(filters)} | ` : ""}Generated: ${new Date().toLocaleString("es-CL")}
          </div>
        </div>
        ${tableHtml}
      </div>
    </body>
    </html>
  `;

  openHtmlPrintTab(fullHtml);
};

export const exportShiftReportToPDF = (report: ShiftReport, responsibleName: string) => {
  const entries =
    typeof report.logEntries === "string" ? JSON.parse(report.logEntries) : report.logEntries;
  const suppliers =
    typeof report.supplierEntries === "string"
      ? JSON.parse(report.supplierEntries)
      : report.supplierEntries;

  const title = `Reporte de Turno - Folio #${report.folio}`;

  const noveltiesContent =
    entries && entries.length > 0
      ? `
      <h2>Novedades Registradas</h2>
      <ul>
        ${(entries as LogEntry[]).map((e) => `<li><span class="time-stamp">${e.time}</span><span class="entry-text">${escapeHtml(e.annotation)}</span></li>`).join("")}
      </ul>
    `
      : "";

  const suppliersContent =
    suppliers && suppliers.length > 0
      ? `
      <h2>Ingresos de Proveedores</h2>
      ${(suppliers as SupplierEntry[])
        .map(
          (s) => `
        <div class="supplier-entry">
          <div class="supplier-header">
            <span class="supplier-name">${escapeHtml(s.company)}</span>
            <span class="time-stamp">${s.time}</span>
          </div>
          <div class="supplier-reason">
            <strong>Conductor:</strong> ${escapeHtml(s.driverName || "N/A")} | <strong>Motivo:</strong> ${escapeHtml(s.reason)}
          </div>
          <div style="margin-top: 8px; display: flex; gap: 12px; align-items: center;">
            <span class="supplier-plate">Patente: ${escapeHtml(s.licensePlate)}</span>
            <span style="font-size: 10px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 0.05em;">
              Pax: ${s.paxCount || 1}
            </span>
          </div>
        </div>
      `,
        )
        .join("")}
    `
      : "";

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
        <style>
            ${getBaseStyles()}
            @media print {
                @page { size: A4 portrait; margin: 20mm; }
            }
            .content-wrapper { 
              max-width: 800px; 
              min-height: 297mm;
            }
            h1 { 
              text-align: left; 
              color: #0f172a; 
              font-size: 32px; 
              font-weight: 900; 
              margin-bottom: 8px; 
              text-transform: uppercase; 
              letter-spacing: -0.05em;
            }
            .report-folio {
              font-size: 12px;
              font-weight: 800;
              color: #6366f1;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin-bottom: 30px;
              display: flex;
              align-items: center;
              gap: 8px;
            }
            .report-folio::before {
              content: "";
              display: block;
              width: 12px;
              height: 2px;
              background: #6366f1;
            }
            h2 { 
              font-size: 10px; 
              color: #64748b; 
              text-transform: uppercase;
              letter-spacing: 0.2em;
              border-bottom: 2px solid #f1f5f9; 
              padding-bottom: 8px; 
              margin-top: 40px;
              font-weight: 800;
            }
            .info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 20px;
              background: #f8fafc;
              padding: 24px;
              border-radius: 4px;
              border: 1px solid #e2e8f0;
            }
            .info-item { display: flex; flex-direction: column; gap: 4px; }
            .info-label { font-size: 9px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.1em; }
            .info-value { font-size: 13px; font-weight: 700; color: #1e293b; }
            ul { list-style-type: none; padding: 0; margin: 20px 0; }
            li { 
              padding: 12px 0;
              border-bottom: 1px solid #f1f5f9;
              display: grid;
              grid-template-columns: 80px 1fr;
              gap: 16px;
              align-items: baseline;
            }
            .time-stamp { font-size: 11px; font-weight: 800; color: #6366f1; }
            .entry-text { font-size: 13px; color: #334155; line-height: 1.6; font-weight: 500; }
            .supplier-entry { background: white; padding: 16px; border-radius: 4px; border: 1px solid #e2e8f0; margin-bottom: 12px; }
            .supplier-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
            .supplier-name { font-weight: 800; text-transform: uppercase; font-size: 12px; color: #0f172a; }
            .supplier-plate { font-size: 10px; font-weight: 700; background: #f1f5f9; padding: 4px 8px; border-radius: 2px; color: #475569; }
            .supplier-reason { font-size: 12px; color: #64748b; font-weight: 500; }
            .report-footer { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 60px; padding-top: 20px; border-top: 2px solid #f1f5f9; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; }
            .status-badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 9999px; font-size: 9px; font-weight: 800; text-transform: uppercase; background: #dcfce7; color: #166534; }
        </style>
    </head>
    <body>
        <div id="print-toolbar">
          <div class="logo-area">
            <div class="logo-main">PORTAL ENTERPRISE</div>
            <div class="logo-sub">Studio | Preview</div>
          </div>
          <button class="print-btn" onclick="window.print()">Confirmar Impresión</button>
        </div>
        <div class="content-wrapper">
          <h1>Bitácora de Turno</h1>
          <div class="report-folio">Folio #${report.folio}</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Responsable</div>
              <div class="info-value">${escapeHtml(responsibleName)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Fecha del Turno</div>
              <div class="info-value">${new Date(report.date).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Nombre del Turno</div>
              <div class="info-value">${escapeHtml(report.shiftName)}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Estado de Bitácora</div>
              <div><span class="status-badge">Cerrada / Auditada</span></div>
            </div>
          </div>
          ${noveltiesContent}
          ${suppliersContent}
          <div class="report-footer">
            Generado automáticamente por PORTAL Management System el ${new Date().toLocaleString("es-CL")}
          </div>
        </div>
    </body>
    </html>
  `;

  openHtmlPrintTab(fullHtml);
};

export const exportCalendarToPDF = (
  title: string,
  periodDisplay: string,
  filtersString: string,
  weekDayNames: string[],
  gridCells: (Date | null)[],
  getCellContent: (date: Date) => string,
) => {
  const gridHtml = gridCells
    .map((date) => {
      if (!date) return '<div class="calendar-cell empty"></div>';
      const dayNum = date.getDate();
      const content = getCellContent(date);
      const isToday = new Date().toDateString() === date.toDateString();

      return `
      <div class="calendar-cell ${isToday ? "today" : ""}">
        <div class="day-number">${dayNum}</div>
        <div class="cell-content">${content}</div>
      </div>
    `;
    })
    .join("");

  const fullHtml = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>${escapeHtml(title)}</title>
        <style>
            ${getBaseStyles()}
            @media print {
                @page { size: landscape; margin: 8mm; }
                body { 
                    background-color: white !important;
                    display: flex !important;
                    justify-content: center !important;
                    align-items: center !important;
                    min-height: 100vh !important;
                }
                .content-wrapper {
                    max-width: 280mm !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                    min-height: auto !important;
                }
                #print-toolbar { display: none !important; }
            }
            .content-wrapper { 
                padding: 40px; 
                max-width: 1200px; 
                margin: 20px auto; 
                background: #fdfbf7; 
                border: 1px solid #e2e8f0;
                display: flex;
                flex-direction: column;
                justify-content: center;
            }
            .report-header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px; }
            .report-header h1 { font-size: 22px; font-weight: 900; margin: 0; text-transform: uppercase; letter-spacing: -0.02em; }
            .report-header h2 { font-size: 16px; margin: 8px 0 0 0; color: #64748b; font-weight: 700; }
            .meta-info { font-size: 10px; color: #94a3b8; margin-top: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
            .calendar-grid {
                display: grid;
                grid-template-columns: repeat(7, 1fr);
                border: 1px solid #cbd5e1;
                background-color: #cbd5e1;
                gap: 1px;
                border-radius: 4px;
                overflow: hidden;
            }
            .calendar-header {
                background-color: #f1f5f9;
                font-weight: 800;
                text-align: center;
                padding: 8px;
                font-size: 11px;
                text-transform: uppercase;
                color: #334155;
            }
            .calendar-cell {
                background-color: #fff;
                min-height: 85px;
                padding: 6px;
                font-size: 9px;
                display: flex;
                flex-direction: column;
            }
            .calendar-cell.empty { background-color: #f8fafc; }
            .calendar-cell.today { background-color: #f0f9ff; }
            .day-number { font-size: 12px; font-weight: 900; color: #1e293b; margin-bottom: 4px; }
            .calendar-cell.today .day-number { color: #0284c7; }
            .cell-content { flex-grow: 1; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
            .schedule-item { padding: 2px; border-radius: 4px; margin-bottom: 2px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; }
            .schedule-item p { margin: 0; font-size: 15px; font-weight: 700; line-height: 1.2; text-align: center; color: #1e293b; }
            .schedule-item p.font-semibold { font-weight: 800; text-transform: uppercase; font-size: 8px; margin-bottom: 1px; }
            .employee-tag { color: white; padding: 1px 4px; border-radius: 2px; margin: 1px; display: inline-block; font-size: 7px; font-weight: 700; }
        </style>
    </head>
    <body>
        <div id="print-toolbar">
          <div class="logo-area">
            <div class="logo-main">PORTAL ENTERPRISE</div>
            <div class="logo-sub">Studio | Preview</div>
          </div>
          <button class="print-btn" onclick="window.print()">Confirmar Impresión</button>
        </div>
        <div class="content-wrapper">
          <div class="report-header">
              <h1>${escapeHtml(title)}</h1>
              <h2>${escapeHtml(periodDisplay)}</h2>
              <div class="meta-info">
                  Filtros: ${escapeHtml(filtersString)} | Generado: ${new Date().toLocaleString("es-CL")}
              </div>
          </div>
          <div class="calendar-grid">
              ${weekDayNames.map((day) => `<div class="calendar-header">${escapeHtml(day)}</div>`).join("")}
              ${gridHtml}
          </div>
        </div>
    </body>
    </html>
  `;

  openHtmlPrintTab(fullHtml);
};
