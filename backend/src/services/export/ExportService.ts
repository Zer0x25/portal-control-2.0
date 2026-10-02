import { Prisma } from "@prisma/client";
import prisma from "../db";
import PDFDocument from "pdfkit";
import { schedulingService } from "../schedulingService";
import { kpiService } from "../kpiService";
import { formatDateUTCISO, toBusinessDateChile } from "../../utils/timeUtils";

interface ReportFilters {
  startDate?: string;
  endDate?: string;
  area?: string;
  employeeId?: string;
  viewMode?: "month" | "week" | "day";
  cargo?: string;
  mode?: "summary" | "compiled_detailed";
  shiftReportId?: string;
}

interface LogEntry {
  time: string;
  annotation: string;
}

interface SupplierEntry {
  time: string;
  company: string;
  driverName: string;
  licensePlate: string;
  paxCount: number;
  reason: string;
}

interface KpiSummaryRow {
  employeeId: string;
  name: string;
  scheduledDays: number;
  totalHoursScheduled: number;
  workedDays: number;
  totalHoursWorked: number;
  differenceHours: number;
  tardinessIncidents: number;
  absenceDays: number;
}

export class ExportService {
  async generateReportPDF(reportType: string, filters: ReportFilters): Promise<Buffer> {
    switch (reportType) {
      case "attendance_summary":
        return this.generateAttendanceSummaryReport(filters);
      case "overtime":
        return this.generateOvertimeReport(filters);
      case "anomalies":
        return this.generateAnomaliesReport(filters);
      case "shift_coverage":
        return this.generateShiftCoverageReport(filters);
      case "calendar":
        return this.generateCalendarPDF(filters);
      case "detailed":
        return this.generateDetailedReportPDF(filters);
      case "shift_report":
        return this.generateShiftReportIndividualPDF(filters.shiftReportId!);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  private calculateWorkedHours(entrada: string | null, salida: string | null): number {
    if (!entrada || !salida) return 0;
    const [entradaHour, entradaMin] = entrada.split(":").map(Number);
    const [salidaHour, salidaMin] = salida.split(":").map(Number);
    let hours = salidaHour - entradaHour;
    let mins = salidaMin - entradaMin;
    if (hours < 0) hours += 24;
    return hours + mins / 60;
  }

  private async generateAttendanceSummaryReport(filters: ReportFilters): Promise<Buffer> {
    const { startDate, endDate, area } = filters;
    const end = endDate ? this.parseDateStringAsUTC(endDate) : new Date();
    const start = startDate
      ? this.parseDateStringAsUTC(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const employees = await prisma.employee.findMany({
      where: {
        status: "Activo",
        ...(area && { area }),
      },
      select: { id: true, name: true, area: true, workdayType: true },
    });

    const records = await prisma.timeRecord.findMany({
      where: {
        date: {
          gte: formatDateUTCISO(start),
          lte: formatDateUTCISO(end),
        },
        employeeId: { in: employees.map((e) => e.id) },
      },
    });

    const summary = employees.map((emp) => {
      const empRecords = records.filter((r) => r.employeeId === emp.id);
      const isExempt = emp.workdayType === "Artículo 22";
      const totalHours = isExempt
        ? 0
        : empRecords.reduce((sum, r) => sum + this.calculateWorkedHours(r.entrada, r.salida), 0);
      const attendanceDays = empRecords.filter((r) => r.entrada).length;

      return {
        name: emp.name,
        area: emp.area,
        totalHours: isExempt ? "0.00" : totalHours.toFixed(2),
        attendanceDays,
      };
    });

    return this.createSimplePDF(
      `Resumen de Asistencia`,
      `${this.formatDate(start)} - ${this.formatDate(end)}`,
      [
        ["Empleado", "Área", "Días Asistidos", "Horas Totales"],
        ...summary.map((s) => [s.name, s.area, s.attendanceDays.toString(), s.totalHours]),
      ],
    );
  }

  private async generateOvertimeReport(filters: ReportFilters): Promise<Buffer> {
    const { startDate, endDate, area } = filters;
    const end = endDate ? this.parseDateStringAsUTC(endDate) : new Date();
    const start = startDate
      ? this.parseDateStringAsUTC(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const employees = await prisma.employee.findMany({
      where: {
        status: "Activo",
        ...(area && { area }),
      },
      select: { id: true, name: true, area: true, workdayType: true },
    });

    const records = await prisma.timeRecord.findMany({
      where: {
        date: {
          gte: formatDateUTCISO(start),
          lte: formatDateUTCISO(end),
        },
        employeeId: { in: employees.map((e) => e.id) },
        salida: { not: null },
      },
    });

    const STANDARD_HOURS = 9;
    const summary = employees
      .map((emp) => {
        const empRecords = records.filter((r) => r.employeeId === emp.id);
        let totalExtraHours = 0;
        let daysWithOvertime = 0;

        empRecords.forEach((r) => {
          const isExempt = emp.workdayType === "Artículo 22";
          if (isExempt) return;

          const hours = this.calculateWorkedHours(r.entrada, r.salida);
          if (hours > STANDARD_HOURS) {
            totalExtraHours += hours - STANDARD_HOURS;
            daysWithOvertime++;
          }
        });

        return {
          name: emp.name,
          area: emp.area,
          totalExtraHours: totalExtraHours.toFixed(2),
          daysWithOvertime,
        };
      })
      .filter((s) => parseFloat(s.totalExtraHours) > 0);

    return this.createSimplePDF(
      `Reporte de Horas Extra`,
      `${this.formatDate(start)} - ${this.formatDate(end)}`,
      [
        ["Empleado", "Área", "Días con HE", "Total Horas Extra"],
        ...summary.map((s) => [s.name, s.area, s.daysWithOvertime.toString(), s.totalExtraHours]),
      ],
    );
  }

  private async generateAnomaliesReport(filters: ReportFilters): Promise<Buffer> {
    const { startDate, endDate, area } = filters;
    const end = endDate ? this.parseDateStringAsUTC(endDate) : new Date();
    const start = startDate
      ? this.parseDateStringAsUTC(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const employees = await prisma.employee.findMany({
      where: {
        status: "Activo",
        ...(area && { area }),
      },
      select: { id: true, name: true },
    });

    const records = await prisma.timeRecord.findMany({
      where: {
        date: {
          gte: formatDateUTCISO(start),
          lte: formatDateUTCISO(end),
        },
        employeeId: { in: employees.map((e) => e.id) },
        OR: [
          { salida: null, entrada: { not: null } },
          { status: { in: ["CierreAutomatico", "AnomaliaManual"] } },
        ],
        isDeleted: false,
      },
    });

    const anomalies = records.map((r) => {
      const emp = employees.find((e) => e.id === r.employeeId);
      return {
        date: r.date,
        employeeName: emp?.name || r.employeeName,
        anomalyType:
          r.status === "CierreAutomatico"
            ? "Cierre Automático"
            : r.status === "AnomaliaManual"
              ? "Anomalía Manual"
              : "Sin Salida",
        details: `Entrada: ${r.entrada}${r.salida ? ` | Salida Auto: ${r.salida}` : ""}`,
      };
    });

    return this.createSimplePDF(
      `Reporte de Anomalías`,
      `${this.formatDate(start)} - ${this.formatDate(end)}`,
      [
        ["Fecha", "Empleado", "Tipo", "Detalles"],
        ...anomalies.map((a) => [a.date, a.employeeName, a.anomalyType, a.details]),
      ],
    );
  }

  private async generateShiftCoverageReport(filters: ReportFilters): Promise<Buffer> {
    const { startDate, endDate } = filters;
    const end = endDate ? this.parseDateStringAsUTC(endDate) : new Date();
    const start = startDate
      ? this.parseDateStringAsUTC(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    const patterns = await prisma.shiftPattern.findMany();
    const assignments = await prisma.assignedShift.findMany({
      where: {
        startDate: { lte: formatDateUTCISO(end) },
        OR: [{ endDate: null }, { endDate: { gte: formatDateUTCISO(start) } }],
      },
    });

    const coverage = patterns.map((p) => {
      const assigned = assignments.filter((a) => a.shiftPatternId === p.id).length;
      return {
        patternName: p.name,
        assignedEmployees: assigned,
        cycleDays: p.cycleLengthDays,
      };
    });

    return this.createSimplePDF(
      `Cobertura de Turnos`,
      `${this.formatDate(start)} - ${this.formatDate(end)}`,
      [
        ["Patrón de Turno", "Empleados Asignados", "Días del Ciclo"],
        ...coverage.map((c) => [
          c.patternName,
          c.assignedEmployees.toString(),
          c.cycleDays.toString(),
        ]),
      ],
    );
  }

  private createSimplePDF(
    title: string,
    dateRange: string,
    tableData: string[][],
  ): Promise<Buffer> {
    let content = `
=================================================================
${title.toUpperCase()}
${dateRange}
Generado: ${new Date().toLocaleString("es-CL")}
=================================================================

`;

    if (tableData.length > 0) {
      const headers = tableData[0];
      const rows = tableData.slice(1);
      content += headers.join(" | ") + "\n";
      content += "-".repeat(60) + "\n";
      rows.forEach((row) => {
        content += row.join(" | ") + "\n";
      });
    }

    content += `
=================================================================
Sistema de Gestión de Turnos - Reporte Automático
=================================================================
`;
    return Promise.resolve(Buffer.from(content, "utf-8"));
  }

  private formatDate(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, "0");
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}-${month}-${year}`;
  }

  private parseDateStringAsUTC(dateString: string): Date {
    const [year, month, day] = dateString.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
  }

  private async generateCalendarPDF(filters: ReportFilters): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 25, size: "A4", layout: "portrait" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const now = new Date();
    let startDate = filters.startDate
      ? this.parseDateStringAsUTC(filters.startDate)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    let endDate = filters.endDate
      ? this.parseDateStringAsUTC(filters.endDate)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    if (isNaN(startDate.getTime()))
      startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    if (isNaN(endDate.getTime()))
      endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));

    const whereClause: Prisma.EmployeeWhereInput = { status: "Activo" };
    if (filters.area) whereClause.area = filters.area;
    if (filters.cargo) whereClause.position = filters.cargo;
    if (filters.employeeId) whereClause.id = filters.employeeId;

    const employees = await prisma.employee.findMany({
      where: whereClause,
      orderBy: { name: "asc" },
      select: { id: true, name: true, area: true, position: true },
    });

    const PAGE_WIDTH = 545;
    const startX = 25;
    const ROW_HEIGHT = 20;
    const HEADER_HEIGHT = 20;

    const colWidths = [45, 25, 75, 55, 55, 55, 235];
    const headers = ["Mes", "Día", "Nombre", "Entrada", "Salida", "H. Proy.", "Observación"];

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const drawEmployeeHeader = (employee: {
      name: string;
      area: string;
      position: string;
    }): number => {
      doc.fillColor("#005792").fontSize(17).font("Helvetica-Bold").text(employee.name, startX, 25);
      doc.fontSize(11).font("Helvetica").fillColor("#666666");
      doc.text(
        `${employee.position} • ${employee.area} | Periodo: ${this.formatDate(startDate)} - ${this.formatDate(endDate)}`,
        startX,
        42,
      );
      return 60;
    };

    const drawTableHeader = (yPos: number): number => {
      doc.fillColor("#005792").rect(startX, yPos, PAGE_WIDTH, HEADER_HEIGHT).fill();
      doc.fillColor("white").font("Helvetica-Bold").fontSize(10);
      let xPos = startX;
      headers.forEach((header, i) => {
        doc.text(header, xPos + 3, yPos + 6, {
          width: colWidths[i],
          align: "left",
        });
        xPos += colWidths[i];
      });
      doc.fillColor("black").font("Helvetica");
      return yPos + HEADER_HEIGHT;
    };

    let pageNum = 0;

    for (const employee of employees) {
      const rows = [];
      let weeklySum = 0;
      let hasWorkData = false;

      for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
        const schedule = await schedulingService.getEmployeeDailyScheduleInfo(
          employee.id,
          new Date(d),
        );

        const month = monthNames[d.getUTCMonth()];
        const dayNum = String(d.getUTCDate()).padStart(2, "0");
        const dayName = dayNames[d.getUTCDay()];
        const isWeekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
        const isSunday = d.getUTCDay() === 0;

        let startTime = "-";
        let endTime = "-";
        let projectedHours = 0;
        let observation = "Descanso";
        let isHoliday = false;
        let isLeave = false;

        if (schedule) {
          if (schedule.isWorkDay) {
            hasWorkData = true;
            startTime = schedule.startTime || "-";
            endTime = schedule.endTime || "-";
            projectedHours = schedule.hours || 0;
            observation = schedule.shiftPatternName || "Turno";
          } else if (schedule.isHoliday) {
            hasWorkData = true;
            isHoliday = true;
            observation = `Feriado: ${schedule.holidayName || ""}`;
          } else if (schedule.justificationType) {
            hasWorkData = true;
            isLeave = true;
            observation = schedule.justificationType;
          }
        }

        rows.push({
          month,
          dayNum,
          dayName,
          startTime,
          endTime,
          projectedHours,
          observation,
          isWeekend,
          isHoliday,
          isLeave,
          isSunday,
        });
        weeklySum += projectedHours;

        const isLastDay = d.getTime() === endDate.getTime();
        if (isSunday || isLastDay) {
          if (weeklySum > 0 || isLastDay) {
            rows.push({
              month: "",
              dayNum: "",
              dayName: "TOTAL",
              startTime: "",
              endTime: "SEMANA:",
              projectedHours: weeklySum,
              observation: "",
              isWeekend: false,
              isHoliday: false,
              isLeave: false,
              isSunday: false,
              isTotalRow: true,
            });
            weeklySum = 0;
          }
        }
      }

      if (!hasWorkData) continue;

      if (pageNum > 0) {
        doc.addPage({ margin: 25, size: "A4", layout: "portrait" });
      }
      pageNum++;

      let currentY = drawEmployeeHeader(employee);
      currentY = drawTableHeader(currentY);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        if (row.isTotalRow) {
          doc.fillColor("#e0f2fe").rect(startX, currentY, PAGE_WIDTH, ROW_HEIGHT).fill();
        } else if (i % 2 === 0) {
          doc.fillColor("#f9fafb").rect(startX, currentY, PAGE_WIDTH, ROW_HEIGHT).fill();
        }
        if (row.isWeekend && row.observation === "Descanso") {
          doc.fillColor("#fef3c7").rect(startX, currentY, PAGE_WIDTH, ROW_HEIGHT).fill();
        }

        doc.fontSize(9);
        let xPos = startX;
        const rowTextColor = row.isSunday || row.isHoliday ? "#dc2626" : "#333333";

        doc.fillColor(rowTextColor).text(row.month, xPos + 3, currentY + 4, {
          width: colWidths[0],
          lineBreak: false,
        });
        xPos += colWidths[0];

        doc
          .fillColor(rowTextColor)
          .font("Helvetica-Bold")
          .text(row.dayNum, xPos + 3, currentY + 4, {
            width: colWidths[1],
            lineBreak: false,
          });
        xPos += colWidths[1];

        doc.font("Helvetica").text(row.dayName, xPos + 3, currentY + 4, {
          width: colWidths[2],
          lineBreak: false,
        });
        xPos += colWidths[2];

        if (!row.isSunday) {
          if (row.isHoliday) doc.fillColor("#dc2626");
          else if (row.isLeave) doc.fillColor("#7c3aed");
          else doc.fillColor("#333333");
        }
        doc.text(row.startTime, xPos + 3, currentY + 4, {
          width: colWidths[3],
          lineBreak: false,
        });
        xPos += colWidths[3];

        doc.text(row.endTime, xPos + 3, currentY + 4, {
          width: colWidths[4],
          lineBreak: false,
        });
        xPos += colWidths[4];

        doc
          .font("Helvetica-Bold")
          .text(
            row.isTotalRow
              ? `${row.projectedHours.toFixed(1)} hrs`
              : row.projectedHours > 0
                ? row.projectedHours.toString()
                : "-",
            xPos + 3,
            currentY + 4,
            { width: colWidths[5], align: "center", lineBreak: false },
          );
        xPos += colWidths[5];

        doc.fillColor(rowTextColor).font("Helvetica-Bold");
        doc.text(row.observation, xPos + 3, currentY + 4, {
          width: colWidths[6],
          ellipsis: true,
          lineBreak: false,
        });
        doc.font("Helvetica");

        currentY += ROW_HEIGHT;
        doc
          .strokeColor("#e5e7eb")
          .moveTo(startX, currentY)
          .lineTo(startX + PAGE_WIDTH, currentY)
          .stroke();
      }

      doc.fontSize(7).fillColor("#9ca3af");
      doc.text(`Generado: ${new Date().toLocaleString("es-CL", { hour12: false })}`, startX, 800, {
        lineBreak: false,
      });
      doc.text(`Página ${pageNum}`, startX + PAGE_WIDTH - 50, 800, {
        width: 50,
        align: "right",
        lineBreak: false,
      });
    }

    if (employees.length === 0 || pageNum === 0) {
      doc
        .fontSize(12)
        .fillColor("#666")
        .text("No se encontraron empleados con los filtros especificados.", {
          align: "center",
        });
    }
    doc.end();

    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  }

  private async generateDetailedReportPDF(filters: ReportFilters): Promise<Buffer> {
    const doc = new PDFDocument({
      margin: 30,
      size: "A4",
      layout: "portrait",
      bufferPages: true,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const startDate = filters.startDate || toBusinessDateChile();
    const endDate = filters.endDate || toBusinessDateChile();

    try {
      const employeeInfoMap = new Map<string, { name: string; area: string; position: string }>();
      const isSingleEmployee = !!filters.employeeId;
      const isCompiled = filters.mode === "compiled_detailed";

      const data = await kpiService.getDetailedReport({
        startDate,
        endDate,
        area: filters.area,
        employeeIds: filters.employeeId ? [filters.employeeId] : undefined,
      });

      if (isSingleEmployee && filters.employeeId) {
        const info = await prisma.employee.findUnique({
          where: { id: filters.employeeId },
          select: { name: true, area: true, position: true },
        });
        if (info) employeeInfoMap.set(filters.employeeId, info);
      } else if (isCompiled) {
        const ids = Object.keys(data.details);
        if (ids.length > 0) {
          const infos = await prisma.employee.findMany({
            where: { id: { in: ids } },
            select: { id: true, name: true, area: true, position: true },
          });
          infos.forEach((i) => employeeInfoMap.set(i.id, i));
        }
      }

      const drawPageHeader = (
        empInfo: { name: string; area: string; position: string } | undefined,
      ) => {
        const startFmt = startDate.split("-").reverse().join("-");
        const endFmt = endDate.split("-").reverse().join("-");

        if (empInfo) {
          doc.fillColor("#005792").fontSize(17).font("Helvetica-Bold").text(empInfo.name, 30, 30);
          doc.fontSize(10).font("Helvetica").fillColor("#666666");
          doc.text(
            `${empInfo.position || "Cargo N/A"} • ${empInfo.area || "Área N/A"} | Periodo: ${startFmt} al ${endFmt}`,
            30,
            50,
          );
        } else {
          doc
            .fillColor("#005792")
            .fontSize(17)
            .font("Helvetica-Bold")
            .text("Reporte de Asistencia General", 30, 30);
          doc.fontSize(10).font("Helvetica").fillColor("#666666");
          doc.text(`Periodo: ${startFmt} al ${endFmt}`, 30, 50);
        }

        doc
          .fontSize(8)
          .fillColor("#9CA3AF")
          .text(`Generado: ${new Date().toLocaleString("es-CL", { hour12: false })}`, 400, 32, {
            align: "right",
            width: 165,
          });
        doc.strokeColor("#E5E7EB").moveTo(30, 65).lineTo(565, 65).lineWidth(1).stroke();
        doc.y = 80;
      };

      if (isSingleEmployee || isCompiled) {
        const employeeIds =
          isSingleEmployee && filters.employeeId
            ? [filters.employeeId]
            : Object.keys(data.details).sort();

        for (let i = 0; i < employeeIds.length; i++) {
          const empId = employeeIds[i];
          const empData = data.details[empId] || [];
          const empInfo = employeeInfoMap.get(empId);
          const stats = data.summary.find((s) => s.employeeId === empId);

          if (i > 0) doc.addPage();

          drawPageHeader(empInfo);
          doc
            .fontSize(14)
            .font("Helvetica-Bold")
            .text("Reporte de Marcaciones", 0, doc.y, { align: "center", width: 595 });
          doc.moveDown(0.8);

          const headers = [
            "Fecha",
            "Día",
            "Turno",
            "Marcaje",
            "H.P",
            "Col.",
            "H.T",
            "Dif.",
            "Justificación",
          ];
          const colWidths = [50, 40, 80, 80, 30, 30, 30, 30, 165];
          let startX = 30;
          let startY = doc.y;

          doc.font("Helvetica-Bold").fontSize(9);
          doc.lineWidth(1);

          const drawTableHeader = (y: number) => {
            doc
              .fillColor("#F3F4F6")
              .rect(startX, y - 2, 535, 15)
              .fill();
            doc.fillColor("#000000");
            let x = startX;
            doc.font("Helvetica-Bold").fontSize(10);
            headers.forEach((h, k) => {
              doc.text(h, x + 2, y + 2, { width: colWidths[k], align: "left" });
              x += colWidths[k];
            });
            doc
              .strokeColor("#9CA3AF")
              .moveTo(startX, y + 14)
              .lineTo(startX + 535, y + 14)
              .lineWidth(0.5)
              .stroke();
          };

          drawTableHeader(startY);
          startY += 15;

          const drawWeeklySubtotal = (sched: number, worked: number, diff: number) => {
            if (startY > 750) {
              doc.addPage();
              startY = 50;
              drawPageHeader(empInfo);
              drawTableHeader(startY);
              startY += 18;
            }
            doc.fillColor("#F9FAFB").rect(startX, startY, 535, 15).fill();
            doc.fillColor("#4B5563").font("Helvetica-Bold").fontSize(9);
            doc.text("Subtotal Semanal", startX + 2, startY + 3, { width: 250, align: "left" });
            let tx = startX + 50 + 40 + 80 + 80;
            doc.text(sched.toFixed(2), tx + 2, startY + 3, { width: 30, align: "left" });
            tx += 30 + 30;
            doc.text(worked.toFixed(2), tx + 2, startY + 3, { width: 30, align: "left" });
            tx += 30;
            doc.text(diff.toFixed(2), tx + 2, startY + 3, { width: 30, align: "left" });
            doc
              .strokeColor("#D1D5DB")
              .moveTo(startX, startY + 15)
              .lineTo(startX + 535, startY + 15)
              .lineWidth(0.5)
              .stroke();
            startY += 15;
          };

          let weeklySched = 0;
          let weeklyWorked = 0;
          let weeklyDiff = 0;

          doc.font("Helvetica").fontSize(8);
          for (const row of empData) {
            if (startY > 750) {
              doc.addPage();
              startY = 50;
              drawPageHeader(empInfo);
              drawTableHeader(startY);
              startY += 18;
            }
            weeklySched += row.scheduledHours;
            weeklyWorked += row.workedHours;
            weeklyDiff += row.differenceHours;

            let x = startX;
            const items = [
              row.date.split("-").reverse().join("-"),
              row.dayOfWeek.substring(0, 3) + ".",
              row.scheduledShift,
              row.actualClocks,
              row.scheduledHours.toFixed(2),
              row.colacionMinutes + "",
              row.workedHours.toFixed(2),
              row.differenceHours.toFixed(2),
              row.justificationType || "",
            ];

            doc.fillColor(row.dayOfWeek === "Domingo" || row.isHoliday ? "#DC2626" : "#000000");
            doc.font("Helvetica").fontSize(9);

            items.forEach((item, k) => {
              doc.text(String(item || ""), x + 2, startY + 4, {
                width: colWidths[k] - 2,
                align: "left",
                height: 12,
                ellipsis: true,
              });
              x += colWidths[k];
            });
            doc
              .strokeColor("#E5E7EB")
              .moveTo(startX, startY + 15)
              .lineTo(startX + 535, startY + 15)
              .lineWidth(0.2)
              .stroke();
            startY += 17;

            if (row.dayOfWeek === "Domingo") {
              drawWeeklySubtotal(weeklySched, weeklyWorked, weeklyDiff);
              weeklySched = 0;
              weeklyWorked = 0;
              weeklyDiff = 0;
            }
          }
          if (weeklySched > 0 || weeklyWorked > 0 || weeklyDiff > 0) {
            drawWeeklySubtotal(weeklySched, weeklyWorked, weeklyDiff);
          }

          if (stats) {
            if (startY > 750) {
              doc.addPage();
              startY = 50;
              drawPageHeader(empInfo);
              drawTableHeader(startY);
              startY += 18;
            }
            doc.fillColor("#F3F4F6").rect(startX, startY, 535, 15).fill();
            doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9);
            doc.text("TOTALES", startX + 2, startY + 3, { width: 250, align: "left" });
            let tx = startX + 50 + 40 + 80 + 80;
            doc.text(stats.totalHoursScheduled.toFixed(2), tx + 2, startY + 3, {
              width: 30,
              align: "left",
            });
            tx += 30 + 30;
            doc.text(stats.totalHoursWorked.toFixed(2), tx + 2, startY + 3, {
              width: 30,
              align: "left",
            });
            tx += 30;
            doc.text(stats.differenceHours.toFixed(2), tx + 2, startY + 3, {
              width: 30,
              align: "left",
            });
            doc
              .strokeColor("#9CA3AF")
              .moveTo(startX, startY + 15)
              .lineTo(startX + 535, startY + 15)
              .lineWidth(1)
              .stroke();
          }
        }
      } else {
        const summaryData = data.summary;
        drawPageHeader(undefined);
        doc
          .fontSize(14)
          .font("Helvetica-Bold")
          .text("Reporte de Marcaciones", 0, doc.y, { align: "center", width: 595 });
        doc.moveDown(0.2);
        doc
          .fontSize(11)
          .font("Helvetica-Bold")
          .fillColor("#666666")
          .text("Resumen por Empleado", 0, doc.y, { align: "center", width: 595 });
        doc.fillColor("#000000").moveDown(1);

        const headers = [
          "Nombre",
          "Días P.",
          "Hrs. P.",
          "Días T.",
          "Hrs. T.",
          "Difer.",
          "Atrasos",
          "Ausencias",
        ];
        const colWidths = [160, 50, 50, 50, 50, 50, 60, 65];
        let startX = 30;
        let startY = doc.y;

        const drawTableSummaryHeader = (y: number) => {
          doc
            .fillColor("#F3F4F6")
            .rect(startX, y - 2, 535, 15)
            .fill();
          doc.fillColor("#000000");
          let x = startX;
          doc.font("Helvetica-Bold").fontSize(8);
          headers.forEach((h, i) => {
            doc.text(h, x + 2, y + 2, { width: colWidths[i], align: "left" });
            x += colWidths[i];
          });
          doc
            .strokeColor("#9CA3AF")
            .moveTo(startX, y + 14)
            .lineTo(startX + 535, y + 14)
            .lineWidth(0.5)
            .stroke();
        };

        drawTableSummaryHeader(startY);
        startY += 18;

        doc.font("Helvetica").fontSize(9);
        for (const row of summaryData) {
          if (startY > 750) {
            doc.addPage();
            drawPageHeader(undefined);
            doc
              .fontSize(14)
              .font("Helvetica-Bold")
              .text("Reporte de Marcaciones", 0, doc.y, { align: "center", width: 595 });
            doc.moveDown(0.2);
            doc
              .fontSize(11)
              .font("Helvetica-Bold")
              .fillColor("#666666")
              .text("Resumen por Empleado", 0, doc.y, { align: "center", width: 595 });
            doc.fillColor("#000000").moveDown(1);
            startY = doc.y;
            drawTableSummaryHeader(startY);
            startY += 18;
            doc.font("Helvetica").fontSize(9);
          }

          let x = startX;
          const items = [
            row.name,
            row.scheduledDays,
            row.totalHoursScheduled.toFixed(2),
            row.workedDays,
            row.totalHoursWorked.toFixed(2),
            row.differenceHours.toFixed(2),
            row.tardinessIncidents,
            row.absenceDays,
          ];

          items.forEach((item, i) => {
            const isAbsenceCol = i === 7;
            const val = Number(item);
            if (isAbsenceCol) {
              if (val > 2) {
                doc.fillColor("#EF4444").strokeColor("#EF4444");
                doc
                  .circle(x + 5.2, startY + 8.2, 5.8)
                  .lineWidth(1)
                  .stroke();
              } else if (val > 1) doc.fillColor("#EF4444");
              else if (val > 0) doc.fillColor("#F97316");
              else doc.fillColor("#000000");
            } else doc.fillColor("#000000");

            doc.text(String(item), x + 2, startY + 4, {
              width: colWidths[i] - 2,
              align: "left",
              ellipsis: true,
            });
            x += colWidths[i];
          });
          doc
            .strokeColor("#E5E7EB")
            .moveTo(startX, startY + 15)
            .lineTo(startX + 535, startY + 15)
            .lineWidth(0.2)
            .stroke();
          startY += 17;
        }

        // Totals Row
        const totalSched = summaryData.reduce(
          (acc: number, curr: KpiSummaryRow) => acc + curr.totalHoursScheduled,
          0,
        );
        const totalWorked = summaryData.reduce(
          (acc: number, curr: KpiSummaryRow) => acc + curr.totalHoursWorked,
          0,
        );
        const totalDiff = summaryData.reduce(
          (acc: number, curr: KpiSummaryRow) => acc + curr.differenceHours,
          0,
        );
        const totalTardy = summaryData.reduce(
          (acc: number, curr: KpiSummaryRow) => acc + curr.tardinessIncidents,
          0,
        );
        const totalAbsence = summaryData.reduce(
          (acc: number, curr: KpiSummaryRow) => acc + curr.absenceDays,
          0,
        );

        if (startY > 740) {
          doc.addPage();
          drawPageHeader(undefined);
          startY = doc.y;
          drawTableSummaryHeader(startY);
          startY += 18;
        }

        doc.fillColor("#F3F4F6").rect(startX, startY, 535, 18).fill();
        doc.fillColor("#000000").font("Helvetica-Bold").fontSize(9);
        doc.text("TOTAL GENERAL", startX + 2, startY + 5, { width: 200, align: "left" });
        let tx = startX + 160 + 50;
        doc.text(totalSched.toFixed(2), tx + 2, startY + 5, { width: 50, align: "left" });
        tx += 50 + 50;
        doc.text(totalWorked.toFixed(2), tx + 2, startY + 5, { width: 50, align: "left" });
        tx += 50;
        doc.text(totalDiff.toFixed(2), tx + 2, startY + 5, { width: 50, align: "left" });
        tx += 50;
        doc.text(String(totalTardy), tx + 2, startY + 5, { width: 50, align: "left" });
        tx += 60;
        doc.text(String(totalAbsence), tx + 2, startY + 5, { width: 65, align: "left" });
        doc
          .strokeColor("#9CA3AF")
          .moveTo(startX, startY + 18)
          .lineTo(startX + 535, startY + 18)
          .lineWidth(1)
          .stroke();
      }

      // Page Numbering
      const range = doc.bufferedPageRange();
      for (let i = range.start; i < range.start + range.count; i++) {
        doc.switchToPage(i);
        doc.fontSize(8).fillColor("#9CA3AF").font("Helvetica");
        doc.text(`Página ${i + 1} de ${range.start + range.count}`, 235, 32, {
          align: "right",
          width: 160,
        });
      }
    } catch (e: unknown) {
      const err = e as Error;
      console.error("PDF Calc Error", err);
      doc.text("Error al generar reporte: " + err.message);
    }
    doc.end();
    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  }

  private async generateShiftReportIndividualPDF(reportId: string): Promise<Buffer> {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));

    const report = await prisma.shiftReport.findUnique({ where: { id: reportId } });
    if (!report) throw new Error("Reporte de turno no encontrado");

    const logEntries = JSON.parse(report.logEntries) as LogEntry[];
    const supplierEntries = JSON.parse(report.supplierEntries) as SupplierEntry[];
    const startX = 40;

    doc
      .fillColor("#005792")
      .fontSize(22)
      .font("Helvetica-Bold")
      .text(`BITÁCORA DE TURNO`, { align: "center" });
    doc
      .fontSize(10)
      .fillColor("#666666")
      .text(`FOLIO: ${report.folio} | ESTADO: ${report.status.toUpperCase()}`, { align: "center" });
    doc.moveDown(2);

    let currentY = doc.y;
    doc.roundedRect(startX, currentY, 515, 75, 8).lineWidth(0.5).strokeColor("#E5E7EB").stroke();
    const drawInfoRow = (
      label: string,
      value: string,
      x: number,
      y: number,
      valueOffset: number = 80,
    ) => {
      doc.fillColor("#4B5563").fontSize(9).font("Helvetica-Bold").text(label, x, y);
      doc
        .fillColor("#111827")
        .font("Helvetica")
        .text(value, x + valueOffset, y);
    };
    drawInfoRow("Responsable:", report.responsibleUser, startX + 15, currentY + 15);
    drawInfoRow("Turno:", report.shiftName, startX + 15, currentY + 30);
    drawInfoRow(
      "Fecha:",
      new Date(report.date).toLocaleDateString("es-CL"),
      startX + 15,
      currentY + 45,
    );
    drawInfoRow(
      "Inicio:",
      new Date(report.startTime).toLocaleString("es-CL"),
      startX + 260,
      currentY + 15,
      50,
    );
    drawInfoRow(
      "Cierre:",
      report.endTime ? new Date(report.endTime).toLocaleString("es-CL") : "---",
      startX + 260,
      currentY + 30,
      50,
    );
    doc.moveDown(5);

    const drawTimelineItem = (
      time: string,
      content: LogEntry | SupplierEntry,
      isSupplier = false,
    ) => {
      if (doc.y > 750) {
        doc.addPage();
        doc.moveDown(2);
      }
      const y = doc.y;
      const timelineX = startX + 45;
      doc
        .circle(timelineX, y + 5, 3)
        .fillColor(isSupplier ? "#10B981" : "#005792")
        .fill();
      doc
        .strokeColor("#E5E7EB")
        .lineWidth(1)
        .moveTo(timelineX, y + 8)
        .lineTo(timelineX, y + 25)
        .stroke();
      doc
        .fillColor("#6B7280")
        .fontSize(9)
        .font("Helvetica-Bold")
        .text(time, startX, y + 1.5, { width: 40, align: "right" });
      const contentX = startX + 60;
      if (isSupplier) {
        const s = content as SupplierEntry;
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(10).text(s.company, contentX, y);
        doc
          .fillColor("#4B5563")
          .font("Helvetica")
          .fontSize(8)
          .text(
            `Cond: ${s.driverName} | Pat: ${s.licensePlate} | Pax: ${s.paxCount}`,
            contentX,
            doc.y + 1,
          );
        doc
          .fillColor("#6B7280")
          .font("Helvetica-Oblique")
          .text(`Motivo: ${s.reason}`, contentX, doc.y + 1);
      } else {
        const l = content as LogEntry;
        doc
          .fillColor("#111827")
          .font("Helvetica")
          .fontSize(9.5)
          .text(l.annotation, contentX, y, { width: 440, align: "left" });
      }
      doc.moveDown(1.2);
    };

    doc
      .fillColor("#005792")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`NOVEDADES DEL TURNO`, startX);
    doc
      .strokeColor("#005792")
      .moveTo(startX, doc.y + 2)
      .lineTo(startX + 150, doc.y + 2)
      .lineWidth(1.5)
      .stroke();
    doc.moveDown(1.5);
    if (logEntries.length > 0) logEntries.forEach((le) => drawTimelineItem(le.time, le));
    else {
      doc
        .fillColor("#9CA3AF")
        .fontSize(9)
        .font("Helvetica-Oblique")
        .text("Sin novedades registradas.", startX + 60);
      doc.moveDown(1);
    }
    doc.moveDown(2);

    doc
      .fillColor("#10B981")
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`INGRESOS DE PROVEEDORES`, startX);
    doc
      .strokeColor("#10B981")
      .moveTo(startX, doc.y + 2)
      .lineTo(startX + 180, doc.y + 2)
      .lineWidth(1.5)
      .stroke();
    doc.moveDown(1.5);
    if (supplierEntries.length > 0)
      supplierEntries.forEach((se) => drawTimelineItem(se.time, se, true));
    else
      doc
        .fillColor("#9CA3AF")
        .fontSize(9)
        .font("Helvetica-Oblique")
        .text("Sin ingresos de proveedores.", startX + 60);

    const pageRange = doc.bufferedPageRange();
    for (let i = 0; i < pageRange.count; i++) {
      doc.switchToPage(i);
      doc.strokeColor("#E5E7EB").moveTo(startX, 770).lineTo(555, 770).lineWidth(0.5).stroke();
      doc.fontSize(7).fillColor("#9CA3AF").font("Helvetica");
      doc.text(
        `Generado por Sistema de Gestión de Turnos - ${new Date().toLocaleString("es-CL")}`,
        startX,
        780,
        { align: "left", width: 400 },
      );
      doc.text(`Página ${i + 1} de ${pageRange.count}`, 505, 780, { width: 50, align: "right" });
    }
    doc.end();
    return new Promise((resolve, reject) => {
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
    });
  }
}
