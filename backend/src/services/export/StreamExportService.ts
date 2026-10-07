import { Response } from "express";
import type { ExcelHttpStream } from "../../utils/httpStream";
import type { Prisma } from "../../generated/prisma/client";
import { Pool, PoolClient } from "pg";
import Cursor from "pg-cursor";
import { promisify } from "util";
import ExcelJS from "exceljs";
import { EmployeeStatus } from "../../generated/prisma/client";

/**
 * Narrows a free-form filter value to a real `EmployeeStatus` member.
 * Returns `undefined` for anything else so callers can skip the filter instead
 * of handing Prisma a value its enum column cannot store.
 */
const toEmployeeStatus = (value: string): EmployeeStatus | undefined =>
  Object.values(EmployeeStatus).find((status) => status === value);

/**
 * StreamExportService
 *
 * Native PostgreSQL cursor-based streaming for large dataset exports.
 * Uses direct pg connection to bypass Prisma limitations on cursors.
 *
 * Memory usage: O(BATCH_SIZE) regardless of total dataset size.
 */
export class StreamExportService {
  private pool: Pool;
  private readonly BATCH_SIZE = 100; // Rows per cursor fetch

  constructor(existingPool?: Pool) {
    if (existingPool) {
      this.pool = existingPool;
    } else {
      // Create dedicated connection pool for exports
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 5, // Limit concurrent export connections
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      this.pool.on("error", (err) => {
        console.error("[StreamExport] Pool error:", err);
      });
    }
  }

  /**
   * GENERIC: Stream any PostgreSQL query to CSV
   * @param res - HTTP response object
   * @param query - Parameterized SQL SELECT query
   * @param params - Query parameters for prepared statement
   * @param headers - CSV column headers (must match query column order)
   * @param filename - Output filename (e.g., "audit_logs_2025_2026.csv")
   */
  async streamQueryToCSV(
    res: Response,
    query: string,
    params: (string | number | boolean | Date | null | string[])[],
    headers: string[],
    filename: string,
  ): Promise<void> {
    let client: PoolClient | null = null;
    let cursor: Cursor | null = null;

    try {
      client = await this.pool.connect();
      cursor = client.query(new Cursor(query, params));

      // Set CSV headers
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      // Write UTF-8 BOM for Excel compatibility
      res.write("\uFEFF");

      // CSV Header Row
      res.write(headers.join(",") + "\n");

      // Stream data in batches
      let hasMore = true;
      while (hasMore) {
        const rows = await this.readCursorBatch(cursor);
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        // Buffer batch content
        let batchOutput = "";
        for (const row of rows) {
          const csvRow = headers.map((h) => {
            let val = row[h];
            if (val === null || val === undefined) return "";
            if (typeof val === "object") val = JSON.stringify(val);
            const str = String(val).replace(/"/g, '""');
            return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
          });
          batchOutput += csvRow.join(",") + "\n";
        }
        res.write(batchOutput);

        if (rows.length < this.BATCH_SIZE) hasMore = false;
      }

      res.end();
    } catch (error) {
      console.error("[StreamExport] Generic CSV streaming error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error al exportar datos" });
      } else {
        res.end();
      }
      throw error;
    } finally {
      if (cursor) {
        try {
          await promisify(cursor.close.bind(cursor))();
        } catch (err) {
          console.error("[StreamExport] Cursor close error:", err);
        }
      }
      if (client) client.release();
    }
  }

  /**
   * GENERIC: Stream any PostgreSQL query to XML
   */
  async streamQueryToXML(
    res: Response,
    query: string,
    params: (string | number | boolean | Date | null | string[])[],
    rootElement: string,
    recordElement: string,
    filename: string,
  ): Promise<void> {
    let client: PoolClient | null = null;
    let cursor: Cursor | null = null;

    try {
      client = await this.pool.connect();
      cursor = client.query(new Cursor(query, params));

      // Set XML headers
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename=${filename}`);

      // Write XML declaration and root element
      res.write(`<?xml version="1.0" encoding="UTF-8"?>\n<${rootElement}>\n`);

      // Stream data in batches
      let hasMore = true;
      while (hasMore) {
        const rows = await this.readCursorBatch(cursor);
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        let batchOutput = "";
        for (const row of rows) {
          batchOutput += `  <${recordElement}>\n`;
          for (const [key, value] of Object.entries(row)) {
            let val = value;
            if (typeof val === "object" && val !== null) {
              val = JSON.stringify(val);
            }
            const cleanVal =
              val === null || val === undefined
                ? ""
                : String(val)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&apos;");
            batchOutput += `    <${key}>${cleanVal}</${key}>\n`;
          }
          batchOutput += `  </${recordElement}>\n`;
        }
        res.write(batchOutput);

        if (rows.length < this.BATCH_SIZE) hasMore = false;
      }

      res.write(`</${rootElement}>\n`);
      res.end();
    } catch (error) {
      console.error("[StreamExport] Generic XML streaming error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: "Error al exportar datos" });
      } else {
        res.end();
      }
      throw error;
    } finally {
      if (cursor) {
        try {
          await promisify(cursor.close.bind(cursor))();
        } catch (err) {
          console.error("[StreamExport] Cursor close error:", err);
        }
      }
      if (client) client.release();
    }
  }

  /**
   * Stream time records as CSV with native PostgreSQL cursor
   */
  async streamToCSV(
    res: ExcelHttpStream,
    filters: {
      startDate: string;
      endDate: string;
      employeeId?: string;
      area?: string;
      cargo?: string;
    },
  ): Promise<void> {
    let client: PoolClient | null = null;
    let cursor: Cursor | null = null;

    try {
      client = await this.pool.connect();
      const { query, params } = this.buildFilteredQuery(filters);
      cursor = client.query(new Cursor(query, params));

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=master_data_${filters.startDate}_${filters.endDate}.csv`,
      );
      res.write("\uFEFF");

      const headers = [
        "id",
        "employeeId",
        "employeeRut",
        "employeeName",
        "employeePosition",
        "employeeArea",
        "employeeWorkdayType",
        "date",
        "entrada",
        "inicioColacion",
        "finColacion",
        "salida",
        "status",
        "source",
        "justification",
        "scheduledStartTime",
        "scheduledEndTime",
        "scheduledHours",
        "shiftPatternName",
      ];
      res.write(headers.join(",") + "\n");

      let hasMore = true;
      while (hasMore) {
        const rows = await this.readCursorBatch(cursor);
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        let batchOutput = "";
        for (const row of rows) {
          const csvRow = headers.map((h) => {
            let val = row[h as keyof typeof row];
            if (val === null || val === undefined) return "";
            if (h === "justification" && typeof val === "object") val = JSON.stringify(val);
            const str = String(val).replace(/"/g, '""');
            return str.includes(",") || str.includes("\n") || str.includes('"') ? `"${str}"` : str;
          });
          batchOutput += csvRow.join(",") + "\n";
        }
        res.write(batchOutput);

        if (rows.length < this.BATCH_SIZE) hasMore = false;
      }
      res.end();
    } catch (error) {
      console.error("[StreamExport] CSV streaming error:", error);
      if (!res.headersSent) res.status(500).json({ message: "Error al exportar datos" });
      else res.end();
      throw error;
    } finally {
      if (cursor) {
        try {
          await promisify(cursor.close.bind(cursor))();
        } catch (err) {
          console.error("[StreamExport] Cursor close error:", err);
        }
      }
      if (client) client.release();
    }
  }

  /**
   * Stream time records as Excel (.xlsx) with native PostgreSQL cursor and exceljs
   */
  async streamToExcel(
    res: ExcelHttpStream,
    filters: {
      startDate: string;
      endDate: string;
      employeeId?: string;
      area?: string;
      cargo?: string;
    },
  ): Promise<void> {
    let client: PoolClient | null = null;
    let cursor: Cursor | null = null;

    try {
      client = await this.pool.connect();
      const { query, params } = this.buildFilteredQuery(filters);
      cursor = client.query(new Cursor(query, params));

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=registros_horario_${filters.startDate}_${filters.endDate}.xlsx`,
      );

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
        useSharedStrings: true,
      });

      const worksheet = workbook.addWorksheet("Registros");

      const columns = [
        { header: "ID", key: "id", width: 15 },
        { header: "ID Empleado", key: "employeeId", width: 15 },
        { header: "RUT Empleado", key: "employeeRut", width: 15 },
        { header: "Nombre Empleado", key: "employeeName", width: 30 },
        { header: "Cargo", key: "employeePosition", width: 20 },
        { header: "Área", key: "employeeArea", width: 20 },
        { header: "Tipo Jornada", key: "employeeWorkdayType", width: 15 },
        { header: "Fecha", key: "date", width: 15 },
        { header: "Entrada", key: "entrada", width: 20 },
        { header: "Inicio Colación", key: "inicioColacion", width: 20 },
        { header: "Fin Colación", key: "finColacion", width: 20 },
        { header: "Fin Jornada", key: "salida", width: 20 },
        { header: "Estado", key: "status", width: 12 },
        { header: "Origen", key: "source", width: 15 },
        { header: "Justificación", key: "justification", width: 40 },
        { header: "Inicio Programado", key: "scheduledStartTime", width: 20 },
        { header: "Fin Programado", key: "scheduledEndTime", width: 20 },
        { header: "Horas Programadas", key: "scheduledHours", width: 18 },
        { header: "Nombre Turno", key: "shiftPatternName", width: 25 },
      ];

      worksheet.columns = columns;

      // Style Header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      let hasMore = true;
      while (hasMore) {
        const rows = await this.readCursorBatch(cursor);
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        for (const row of rows) {
          const excelRow = {
            id: row.id,
            employeeId: row.employeeId,
            employeeRut: row.employeeRut,
            employeeName: row.employeeName,
            employeePosition: row.employeePosition,
            employeeArea: row.employeeArea,
            employeeWorkdayType: row.employeeWorkdayType,
            date: row.date,
            entrada: row.entrada,
            inicioColacion: row.inicioColacion,
            finColacion: row.finColacion,
            salida: row.salida,
            status: row.status,
            source: row.source,
            justification:
              typeof row.justification === "object" && row.justification !== null
                ? JSON.stringify(row.justification)
                : row.justification,
            scheduledStartTime: row.scheduledStartTime,
            scheduledEndTime: row.scheduledEndTime,
            scheduledHours: row.scheduledHours,
            shiftPatternName: row.shiftPatternName,
          };
          worksheet.addRow(excelRow).commit();
        }

        if (rows.length < this.BATCH_SIZE) hasMore = false;
      }

      await worksheet.commit();
      await workbook.commit();
    } catch (error) {
      console.error("[StreamExport] Excel streaming error:", error);
      if (!res.headersSent) res.status(500).json({ message: "Error al exportar datos a Excel" });
      else res.end();
      throw error;
    } finally {
      if (cursor) {
        try {
          await promisify(cursor.close.bind(cursor))();
        } catch (err) {
          console.error("[StreamExport] Cursor close error:", err);
        }
      }
      if (client) client.release();
    }
  }

  /**
   * Stream employees as Excel (.xlsx)
   */
  async streamEmployeesToExcel(
    res: ExcelHttpStream,
    filters: {
      search?: string;
      status?: string;
      area?: string;
    },
  ): Promise<void> {
    try {
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename=lista_empleados.xlsx`);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
        useSharedStrings: true,
      });

      const worksheet = workbook.addWorksheet("Empleados");

      const columns = [
        { header: "ID", key: "id", width: 15 },
        { header: "Nombre", key: "name", width: 30 },
        { header: "RUT", key: "rut", width: 15 },
        { header: "Email", key: "email", width: 25 },
        { header: "Cargo", key: "position", width: 20 },
        { header: "Área", key: "area", width: 20 },
        { header: "Tipo Jornada", key: "workdayType", width: 20 },
        { header: "Estado", key: "status", width: 12 },
      ];

      worksheet.columns = columns;

      // Style Header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Fetch data in batches
      const where: Prisma.EmployeeWhereInput = {};
      if (filters.search) {
        where.OR = [
          { name: { contains: filters.search, mode: "insensitive" } },
          { rut: { contains: filters.search, mode: "insensitive" } },
          { position: { contains: filters.search, mode: "insensitive" } },
        ];
      }
      if (filters.status && filters.status !== "Todos") {
        // `status` arrives as a free-form query string. Only forward values that
        // are real `EmployeeStatus` members; anything else would make Prisma
        // reject the query at runtime.
        const status = toEmployeeStatus(filters.status);
        if (status) where.status = status;
      }
      if (filters.area && filters.area !== "Todas") {
        where.area = filters.area;
      }

      let skip = 0;
      let hasMore = true;
      const CHUNK_SIZE = 100;

      const prisma = (await import("../db")).default;

      while (hasMore) {
        const employees = await prisma.employee.findMany({
          where,
          orderBy: { name: "asc" },
          skip,
          take: CHUNK_SIZE,
        });

        if (employees.length === 0) {
          hasMore = false;
          break;
        }

        for (const emp of employees) {
          worksheet
            .addRow({
              id: emp.id,
              name: emp.name,
              rut: emp.rut,
              email: emp.email,
              position: emp.position,
              area: emp.area,
              workdayType: emp.workdayType,
              status: emp.status,
            })
            .commit();
        }

        skip += CHUNK_SIZE;
        if (employees.length < CHUNK_SIZE) hasMore = false;
      }

      await worksheet.commit();
      await workbook.commit();
    } catch (error) {
      console.error("[StreamExport] Employees Excel error:", error);
      if (!res.headersSent) res.status(500).json({ message: "Error al exportar empleados" });
      else res.end();
      throw error;
    }
  }

  /**
   * Stream shift report as Excel (.xlsx)
   */
  async streamShiftReportToExcel(res: ExcelHttpStream, shiftId: string): Promise<void> {
    try {
      const prisma = (await import("../db")).default;
      const report = await prisma.shiftReport.findUnique({
        where: { id: shiftId },
      });

      if (!report) {
        res.status(404).json({ message: "Reporte no encontrado" });
        return;
      }

      const logEntries = JSON.parse(report.logEntries);
      const supplierEntries = JSON.parse(report.supplierEntries);

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename=Reporte_${report.folio}.xlsx`);

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
        useSharedStrings: true,
      });

      const worksheet = workbook.addWorksheet("Bitácora");

      worksheet.columns = [
        { header: "Hora", key: "time", width: 15 },
        { header: "Tipo", key: "type", width: 15 },
        { header: "Detalle", key: "detail", width: 40 },
        { header: "Responsable / Patente", key: "responsible", width: 25 },
        { header: "Info Adicional", key: "additional", width: 40 },
      ];

      // Style Header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" },
      };

      // Add Log Entries
      for (const le of logEntries) {
        worksheet
          .addRow({
            time: le.time,
            type: "NOVEDAD",
            detail: le.annotation,
            responsible: report.responsibleUser,
            additional: "",
          })
          .commit();
      }

      // Add Supplier Entries
      for (const se of supplierEntries) {
        worksheet
          .addRow({
            time: se.time,
            type: "PROVEEDOR",
            detail: se.company,
            responsible: se.licensePlate,
            additional: `Cond: ${se.driverName}, Pax: ${se.paxCount}, Motivo: ${se.reason}`,
          })
          .commit();
      }

      await worksheet.commit();
      await workbook.commit();
    } catch (error) {
      console.error("[StreamExport] Shift Report Excel error:", error);
      if (!res.headersSent) res.status(500).json({ message: "Error al exportar reporte de turno" });
      else res.end();
      throw error;
    }
  }

  /**
   * Stream KPI Report as Excel (.xlsx)
   */
  async streamKpiReportToExcel(
    res: Response,
    filters: {
      startDate: string;
      endDate: string;
      employeeId?: string;
      area?: string;
      mode?: "summary" | "detailed";
    },
  ): Promise<void> {
    try {
      const { kpiService } = await import("../kpiService");
      const isIndividual = !!filters.employeeId;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=Reporte_KPI_${filters.startDate}_${filters.endDate}.xlsx`,
      );

      const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
        stream: res,
        useStyles: true,
        useSharedStrings: true,
      });

      const worksheet = workbook.addWorksheet("KPIs");

      if (isIndividual) {
        // Detailed report for one employee
        worksheet.columns = [
          { header: "Fecha", key: "isoDate", width: 15 },
          { header: "Día", key: "dayOfWeek", width: 12 },
          { header: "Turno", key: "scheduledShift", width: 25 },
          { header: "Entrada", key: "actualClocks", width: 20 },
          { header: "H. Prog", key: "scheduledHours", width: 10 },
          { header: "H. Real", key: "workedHours", width: 10 },
          { header: "Estado", key: "status", width: 15 },
          { header: "Justificación", key: "justificationType", width: 20 },
        ];
        const data = await kpiService.getDetailedReport({
          startDate: filters.startDate,
          endDate: filters.endDate,
          employeeIds: [filters.employeeId!],
        });

        const empId = filters.employeeId!;
        const rows = data.details[empId] || [];
        for (const row of rows) {
          worksheet.addRow(row).commit();
        }
      } else {
        // Team Summary
        worksheet.columns = [
          { header: "Empleado", key: "name", width: 30 },
          { header: "H. Reales", key: "totalHoursWorked", width: 15 },
          { header: "H. Prog.", key: "totalHoursScheduled", width: 15 },
          { header: "Diferencia", key: "differenceHours", width: 15 },
          { header: "Inasistencias", key: "absenceDays", width: 15 },
          { header: "Atrasos", key: "tardinessIncidents", width: 15 },
          { header: "Días Prog.", key: "scheduledDays", width: 15 },
          { header: "Días Trab.", key: "workedDays", width: 15 },
        ];

        const data = await kpiService.getDetailedReport({
          startDate: filters.startDate,
          endDate: filters.endDate,
          area: filters.area,
        });

        const rows = data.summary || [];
        for (const stat of rows) {
          worksheet.addRow(stat).commit();
        }
      }

      await worksheet.commit();
      await workbook.commit();
    } catch (error) {
      console.error("[StreamExport] KPI Excel error:", error);
      if (!res.headersSent) res.status(500).json({ message: "Error al exportar KPI Excel" });
      else res.end();
      throw error;
    }
  }

  /**
   * Stream time records as XML with native PostgreSQL cursor
   */
  async streamToXML(
    res: ExcelHttpStream,
    filters: {
      startDate: string;
      endDate: string;
      employeeId?: string;
      area?: string;
      cargo?: string;
    },
  ): Promise<void> {
    let client: PoolClient | null = null;
    let cursor: Cursor | null = null;

    try {
      client = await this.pool.connect();
      const { query, params } = this.buildFilteredQuery(filters);
      cursor = client.query(new Cursor(query, params));

      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=master_data_${filters.startDate}_${filters.endDate}.xml`,
      );
      res.write('<?xml version="1.0" encoding="UTF-8"?>\n<TimeRecords>\n');

      let hasMore = true;
      while (hasMore) {
        const rows = await this.readCursorBatch(cursor);
        if (rows.length === 0) {
          hasMore = false;
          break;
        }

        let batchOutput = "";
        for (const row of rows) {
          batchOutput += "  <Record>\n";
          for (const [key, value] of Object.entries(row)) {
            let val = value;
            if (typeof val === "object" && val !== null) val = JSON.stringify(val);
            const cleanVal =
              val === null || val === undefined
                ? ""
                : String(val)
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&apos;");
            batchOutput += `    <${key}>${cleanVal}</${key}>\n`;
          }
          batchOutput += "  </Record>\n";
        }
        res.write(batchOutput);

        if (rows.length < this.BATCH_SIZE) hasMore = false;
      }
      res.write("</TimeRecords>\n");
      res.end();
    } catch (error) {
      console.error("[StreamExport] XML streaming error:", error);
      if (!res.headersSent) res.status(500).json({ message: "Error al exportar datos" });
      else res.end();
      throw error;
    } finally {
      if (cursor) {
        try {
          await promisify(cursor.close.bind(cursor))();
        } catch (err) {
          console.error("[StreamExport] Cursor close error:", err);
        }
      }
      if (client) client.release();
    }
  }

  /**
   * Build parameterized SQL query with filters
   */
  private buildFilteredQuery(filters: {
    startDate: string;
    endDate: string;
    employeeId?: string;
    area?: string;
    cargo?: string;
  }): { query: string; params: (string | number | boolean | Date | null | string[])[] } {
    const params: (string | number | boolean | Date | null | string[])[] = [
      filters.startDate,
      filters.endDate,
    ];
    let paramIndex = 3;

    let whereClause = `WHERE tr.date >= $1 AND tr.date <= $2 AND tr.is_deleted = false`;

    if (filters.employeeId) {
      whereClause += ` AND tr.employee_id = $${paramIndex}`;
      params.push(filters.employeeId);
      paramIndex++;
    }

    if (filters.area) {
      whereClause += ` AND tr.employee_area = $${paramIndex}`;
      params.push(filters.area);
      paramIndex++;
    }

    if (filters.cargo) {
      whereClause += ` AND tr.employee_position = $${paramIndex}`;
      params.push(filters.cargo);
      paramIndex++;
    }

    const query = `
      SELECT 
        tr.id,
        tr.employee_id as "employeeId",
        e.rut as "employeeRut",
        tr.employee_name as "employeeName",
        tr.employee_position as "employeePosition",
        tr.employee_area as "employeeArea",
        tr.employee_workday_type as "employeeWorkdayType",
        tr.date,
        tr.entrada,
        tr.inicio_colacion as "inicioColacion",
        tr.fin_colacion as "finColacion",
        tr.salida,
        tr.status,
        tr.source,
        tr.justification,
        tr.scheduled_start_time as "scheduledStartTime",
        tr.scheduled_end_time as "scheduledEndTime",
        tr.scheduled_hours as "scheduledHours",
        tr.shift_pattern_name as "shiftPatternName"
      FROM time_records tr
      LEFT JOIN employees e ON tr.employee_id = e.id
      ${whereClause}
      ORDER BY tr.date ASC, tr.created_at ASC
    `;

    return { query, params };
  }

  /**
   * Read batch from cursor with promisified async behavior
   */
  private async readCursorBatch(cursor: Cursor): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      cursor.read(this.BATCH_SIZE, (err, rows) => {
        if (err) return reject(err);
        resolve(rows as Record<string, unknown>[]);
      });
    });
  }

  /**
   * Graceful shutdown - close pool
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

export const streamExportService = new StreamExportService();
