import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ServerClock";

const meta = {
  id: "certified-components-ui-server-clock",
  title: "Design System/components/ui/Server/Clock",
  component: StoryComponent,
  args: { showDate: true },
  argTypes: {
    showDate: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/ServerClock.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const TimeOnly: Story = {
  args: {
    showDate: false,
  },
};

export const CompactBadge: Story = {
  args: {
    showDate: true,
    containerClassName:
      "inline-flex flex-col items-start gap-1 rounded-xl border border-token-border-technical bg-token-surface-card px-4 py-3 shadow-sm",
    timeClassName: "text-2xl font-mono font-black text-token-accent-brand",
  },
};
