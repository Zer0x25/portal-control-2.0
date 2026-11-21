import type { Meta, StoryObj } from "@storybook/react-vite";
import { IndustrialIndicator, LiveStatus, SystemStatusIndicator } from "./IndustrialIndicator";

const meta = {
  id: "certified-components-ui-industrial-indicator",
  title: "Design System/components/ui/Industrial/Indicator",
  component: SystemStatusIndicator,
  args: {
    label: "SISTEMA ACTIVO",
    status: "online",
  },
  argTypes: {
    status: {
      control: "inline-radio",
      options: ["online", "offline"],
    },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/IndustrialIndicator.tsx",
      },
    },
  },
} satisfies Meta<typeof SystemStatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Offline: Story = {
  args: {
    label: "SIN ENLACE",
    status: "offline",
  },
};

export const PrimitivesOverview: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-6">
      <div className="flex items-center gap-2">
        <IndustrialIndicator color="bg-token-accent-brand" height="h-8" />
        <IndustrialIndicator color="bg-token-status-success" height="h-8" />
        <IndustrialIndicator color="bg-token-status-warning" height="h-8" />
      </div>
      <div className="flex items-center gap-3">
        <LiveStatus color="bg-token-status-success" size="w-2.5 h-2.5" />
        <LiveStatus color="bg-token-status-warning" size="w-2.5 h-2.5" />
        <LiveStatus color="bg-token-status-error" size="w-2.5 h-2.5" />
      </div>
      <SystemStatusIndicator label="SISTEMA ACTIVO" status="online" />
      <SystemStatusIndicator label="EN MANTENCIÓN" status="offline" />
    </div>
  ),
};
