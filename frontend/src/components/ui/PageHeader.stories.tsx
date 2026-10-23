import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./PageHeader";

const meta = {
  id: "certified-components-ui-page-header",
  title: "Design System/components/ui/Page/Header",
  component: StoryComponent,
  args: { title: "Personal", subtitle: "Administra el equipo", eyebrow: "Operaciones" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/PageHeader.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
