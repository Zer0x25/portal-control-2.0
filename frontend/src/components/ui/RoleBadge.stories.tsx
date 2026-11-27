import type { Meta, StoryObj } from "@storybook/react-vite";
import RoleBadge from "./RoleBadge";

const meta = {
  id: "certified-components-ui-role-badge",
  title: "Design System/components/ui/Role/Badge",
  component: RoleBadge,
  args: { role: "Super_Administrador", size: "md" },
  argTypes: {
    role: {
      control: "select",
      options: [
        "Super_Administrador",
        "Administrador",
        "Supervisor",
        "Reloj_Control",
        "Fiscalizador",
        "Usuario",
        "Archivado",
      ],
    },
    size: { control: "inline-radio", options: ["xs", "sm", "md"] },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/RoleBadge.tsx" } },
  },
} satisfies Meta<typeof RoleBadge>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Supervisor: Story = { args: { role: "Supervisor", size: "md" } };
export const RelojControlSmall: Story = { args: { role: "Reloj_Control", size: "sm" } };
export const UsuarioXS: Story = { args: { role: "Usuario", size: "xs" } };
