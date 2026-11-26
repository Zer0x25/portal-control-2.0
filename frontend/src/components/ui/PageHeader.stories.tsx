import type { Meta, StoryObj } from "@storybook/react-vite";
import PageHeader from "./PageHeader";

const meta = {
  id: "certified-components-ui-page-header",
  title: "Design System/components/ui/Page/Header",
  component: PageHeader,
  args: { title: "Personal", subtitle: "Administra el equipo", eyebrow: "Operaciones" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/PageHeader.tsx" } },
  },
} satisfies Meta<typeof PageHeader>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const MinimalWithoutSubtitle: Story = {
  args: {
    title: "Reportes",
    subtitle: undefined,
    eyebrow: undefined,
  },
};
