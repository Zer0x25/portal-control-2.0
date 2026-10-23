import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Button";
const meta = {
  id: "certified-components-ui-button",
  title: "Design System/components/ui/Button",
  component: StoryComponent,
  args: { children: "Guardar cambios" },
  tags: ["autodocs"],
} satisfies Meta<typeof StoryComponent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = { args: { variant: "primary", size: "md" } };
export const Primary: Story = { args: { variant: "primary", size: "md" } };
export const Secondary: Story = { args: { variant: "secondary", size: "md" } };
export const Disabled: Story = { args: { variant: "primary", size: "md", disabled: true } };
