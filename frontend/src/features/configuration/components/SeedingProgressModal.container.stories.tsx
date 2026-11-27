import type { Meta, StoryObj } from "@storybook/react-vite";
import SeedingProgressModalContainer from "./SeedingProgressModal.container";
import type { SeedPhase2Job } from "../../../services/seedingService";

const phase2Job: SeedPhase2Job = {
  id: "seed-job-story",
  status: "running",
  config: { days: 90, leaveRatio: 5, correctionRequestRatio: 2, batchSize: 250 },
  progress: {
    currentDay: 34,
    totalDays: 90,
    processedRecords: 1020,
    sealedRecords: 980,
    errors: 2,
  },
};

const meta = {
  id: "certified-features-configuration-components-seeding-progress-modal",
  title: "Design System/features/configuration/components/Seeding/Progress/Modal",
  component: SeedingProgressModalContainer,
  args: {
    isOpen: true,
    onClose: () => undefined,
    progressSteps: ["Preparando datos", "Validando registros"],
    isFinished: true,
    error: null,
    seedingOptions: null,
    onStartPhase2: () => undefined,
    onPausePhase2: () => undefined,
    onResumePhase2: () => undefined,
    onStopPhase2: () => undefined,
  },
  argTypes: {
    isOpen: { control: "boolean" },
    isFinished: { control: "boolean" },
    error: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/configuration/components/SeedingProgressModal.view.tsx",
      },
    },
  },
} satisfies Meta<typeof SeedingProgressModalContainer>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const InProgress: Story = {
  args: {
    isFinished: false,
    progressSteps: ["Creando estructura base...", "Generando patrones de turno..."],
  },
};

export const WithError: Story = {
  args: {
    isFinished: true,
    error: "No fue posible completar el sembrado de registros.",
  },
};

export const Phase2Running: Story = {
  args: {
    isFinished: true,
    job: phase2Job,
    jobLogs: [
      "Día 30 de 90 sellado (1020 registros)",
      "Día 31 de 90 sellado (1024 registros)",
      "Día 32 de 90 sellado (1018 registros)",
    ],
  },
};

export const Phase2Paused: Story = {
  args: {
    isFinished: true,
    job: { ...phase2Job, status: "paused" },
    jobLogs: ["Día 30 de 90 sellado (1020 registros)", "Fase 2 pausada por operador."],
  },
};

export const Phase2Failed: Story = {
  args: {
    isFinished: true,
    job: {
      ...phase2Job,
      status: "failed",
      errorSummary: "Timeout procesando el día 34: la base no respondió.",
    },
    jobLogs: ["Día 33 de 90 sellado (1015 registros)", "ERROR: timeout del día 34."],
  },
};
