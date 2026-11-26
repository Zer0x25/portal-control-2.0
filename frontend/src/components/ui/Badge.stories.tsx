import type { Meta, StoryObj } from "@storybook/react-vite";
import Badge from "./Badge";
const meta = {
  id: "certified-components-ui-badge",
  title: "Design System/components/ui/Badge",
  component: Badge,
  args: { size: "md" },
  tags: ["autodocs"],
} satisfies Meta<typeof Badge>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { children: "Activo", variant: "success", showDot: true } };
export const Success: Story = { args: { children: "Activo", variant: "success", showDot: true } };
export const Warning: Story = {
  args: { children: "Pendiente", variant: "warning", showDot: true },
};
export const Danger: Story = { args: { children: "Bloqueado", variant: "danger", showDot: false } };
