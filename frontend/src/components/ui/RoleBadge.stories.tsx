import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./RoleBadge";

const meta = {
  id: "certified-components-ui-role-badge",
  title: "Design System/components/ui/Role/Badge",
  component: StoryComponent,
  args: { role: "Administrador", size: "md" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/RoleBadge.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
