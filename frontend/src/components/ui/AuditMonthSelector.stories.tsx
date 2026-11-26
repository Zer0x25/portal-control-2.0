import type { Meta, StoryObj } from "@storybook/react-vite";
import AuditMonthSelector from "./AuditMonthSelector";

const meta = {
  id: "certified-components-ui-audit-month-selector",
  title: "Design System/components/ui/Audit/Month/Selector",
  component: AuditMonthSelector,
  args: {
    currentDate: new Date("2026-10-23T12:00:00.000Z"),
    onChange: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/AuditMonthSelector.tsx",
      },
    },
  },
} satisfies Meta<typeof AuditMonthSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const JanuaryView: Story = {
  args: {
    currentDate: new Date("2026-01-15T12:00:00.000Z"),
  },
};
