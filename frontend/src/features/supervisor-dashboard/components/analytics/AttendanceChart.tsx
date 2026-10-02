import React, { useMemo } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { format, subDays, eachDayOfInterval } from "date-fns";
import { es } from "date-fns/locale";
import { useBusinessNow } from "../../../../hooks/useBusinessNow";
import { parseBusinessDateCL } from "../../../../utils/dateUtils";

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface AttendanceData {
  date: string;
  present: number;
  total: number;
  late: number;
}

interface AttendanceChartProps {
  data: AttendanceData[];
  days?: number;
  className?: string;
  showAnimation?: boolean;
}

/**
 * Componente de gráfico de asistencia
 * Muestra tendencias de asistencia, llegadas tarde y ausencias
 * Optimizado con memoización para performance
 */
export const AttendanceChart: React.FC<AttendanceChartProps> = React.memo(
  ({ data, days = 30, className = "", showAnimation = true }) => {
    const businessNow = useBusinessNow({ tickMs: null });

    // Generar datos de los últimos N días si no hay datos suficientes
    const chartData = useMemo(() => {
      const endDate = businessNow;
      const startDate = subDays(businessNow, days - 1);
      const dateRange = eachDayOfInterval({ start: startDate, end: endDate });

      // Crear mapa de datos existentes
      const dataMap = new Map(data.map((item) => [item.date, item]));

      // Completar datos faltantes con valores por defecto
      const completeData = dateRange.map((date) => {
        const dateKey = format(date, "yyyy-MM-dd");
        const existingData = dataMap.get(dateKey);

        return (
          existingData || {
            date: dateKey,
            present: 0,
            total: 0,
            late: 0,
          }
        );
      });

      return {
        labels: completeData.map((item) =>
          format(parseBusinessDateCL(item.date), "dd/MM", { locale: es }),
        ),
        datasets: [
          {
            label: "Presentes",
            data: completeData.map((item) => item.present),
            borderColor: "rgb(34, 197, 94)", // emerald-500
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Llegadas Tarde",
            data: completeData.map((item) => item.late),
            borderColor: "rgb(245, 158, 11)", // amber-500
            backgroundColor: "rgba(245, 158, 11, 0.1)",
            tension: 0.4,
            fill: true,
          },
          {
            label: "Total Plantilla",
            data: completeData.map((item) => item.total),
            borderColor: "rgb(107, 114, 128)", // gray-500
            backgroundColor: "rgba(107, 114, 128, 0.1)",
            borderDash: [5, 5],
            tension: 0.4,
            fill: false,
          },
        ],
      };
    }, [businessNow, data, days]);

    // Configuración del gráfico
    const options: ChartOptions<"line"> = useMemo(
      () => ({
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: "index" as const,
          intersect: false,
        },
        plugins: {
          legend: {
            position: "top" as const,
            labels: {
              usePointStyle: true,
              padding: 20,
              font: {
                size: 12,
                family: "Inter, system-ui, sans-serif",
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            titleColor: "white",
            bodyColor: "white",
            borderColor: "rgba(255, 255, 255, 0.1)",
            borderWidth: 1,
            cornerRadius: 8,
            displayColors: true,
            padding: 12,
            callbacks: {
              title: (context) => {
                const dateIndex = context[0].dataIndex;
                const dateRange = eachDayOfInterval({
                  start: subDays(businessNow, days - 1),
                  end: businessNow,
                });
                return format(dateRange[dateIndex], "EEEE, dd/MM/yyyy", { locale: es });
              },
            },
          },
        },
        scales: {
          x: {
            grid: {
              display: false,
            },
            ticks: {
              maxTicksLimit: 7,
              font: {
                size: 11,
              },
            },
          },
          y: {
            beginAtZero: true,
            grid: {
              color: "rgba(0, 0, 0, 0.1)",
            },
            ticks: {
              precision: 0,
              font: {
                size: 11,
              },
            },
          },
        },
        animation: showAnimation
          ? {
              duration: 1000,
              easing: "easeInOutQuart",
            }
          : false,
      }),
      [businessNow, days, showAnimation],
    );

    return (
      <div className={`w-full h-80 ${className}`}>
        <Line data={chartData} options={options} />
      </div>
    );
  },
);

AttendanceChart.displayName = "AttendanceChart";
