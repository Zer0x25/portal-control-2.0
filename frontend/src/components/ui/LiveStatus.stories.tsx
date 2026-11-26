import type { Meta, StoryObj } from "@storybook/react-vite";
import LiveStatus from "./LiveStatus";

const meta = {
  id: "certified-components-ui-live-status",
  title: "Design System/components/ui/Live/Status",
  component: LiveStatus,
  args: { label: "Sistema operativo", status: "online" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/LiveStatus.tsx" } },
  },
} satisfies Meta<typeof LiveStatus>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Warning: Story = {
  args: {
    label: "Reconectando",
    status: "warning",
  },
};
export const Offline: Story = {
  args: {
    label: "Sin conexión",
    status: "offline",
  },
};
