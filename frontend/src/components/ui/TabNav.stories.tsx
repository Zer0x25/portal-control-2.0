import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./TabNav";

const meta = {
  id: "certified-components-ui-tab-nav",
  title: "Design System/components/ui/Tab/Nav",
  component: StoryComponent,
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
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
