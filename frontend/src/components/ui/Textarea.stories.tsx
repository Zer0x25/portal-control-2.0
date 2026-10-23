import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Textarea";

const meta = {
  id: "certified-components-ui-textarea",
  title: "Design System/components/ui/Textarea",
  component: StoryComponent,
  args: { label: "Comentario", value: "Buen trabajo", rows: 3 },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Textarea.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
