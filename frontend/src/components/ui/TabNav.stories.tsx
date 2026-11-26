import type { Meta, StoryObj } from "@storybook/react-vite";
import TabNav from "./TabNav";

const meta = {
  id: "certified-components-ui-tab-nav",
  title: "Design System/components/ui/Tab/Nav",
  component: TabNav,
  args: {
    tabs: [
      { id: "overview", label: "Resumen" },
      { id: "activity", label: "Actividad" },
    ],
    activeTab: "overview",
    onTabChange: () => undefined,
    ariaLabel: "Secciones de ejemplo",
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/TabNav.tsx" } },
  },
} satisfies Meta<typeof TabNav>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const Minimal: Story = {
  args: {
    variant: "minimal",
  },
};
export const UnderlineWithBadges: Story = {
  args: {
    variant: "underline",
    tabs: [
      { id: "overview", label: "Resumen", badge: 4 },
      { id: "activity", label: "Actividad", badge: "Nuevo" },
    ],
  },
};
