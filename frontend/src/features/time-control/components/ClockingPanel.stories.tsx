import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ClockingPanel";

const meta = {
  id: "certified-features-time-control-components-clocking-panel",
  title: "Design System/features/time-control/components/Clocking/Panel",
  component: StoryComponent,
  args: { isActionDisabled: false, roleBasedTooltip: "Registrar marcaje" },
  argTypes: {
    isActionDisabled: { control: "boolean" },
    roleBasedTooltip: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/time-control/components/ClockingPanel.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const DisabledForRole: Story = {
  args: {
    isActionDisabled: true,
    roleBasedTooltip: "Acción restringida para este perfil",
  },
};
