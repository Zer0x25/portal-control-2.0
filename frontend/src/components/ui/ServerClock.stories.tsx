import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ServerClock";

const meta = {
  id: "certified-components-ui-server-clock",
  title: "Design System/components/ui/Server/Clock",
  component: StoryComponent,
  args: { showDate: true },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/ServerClock.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
