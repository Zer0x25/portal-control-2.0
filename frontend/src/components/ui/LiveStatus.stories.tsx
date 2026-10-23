import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./LiveStatus";

const meta = {
  id: "certified-components-ui-live-status",
  title: "Design System/components/ui/Live/Status",
  component: StoryComponent,
  args: { label: "Sistema operativo", status: "online" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/LiveStatus.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
