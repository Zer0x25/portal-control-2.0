import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Skeleton";

const meta = {
  id: "certified-components-ui-skeleton",
  title: "Design System/components/ui/Skeleton",
  component: StoryComponent,
  args: { width: "12rem", height: "1rem" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Skeleton.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
