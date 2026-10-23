import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Sidebar.view";

const meta = {
  id: "certified-components-layout-sidebar",
  title: "Design System/components/layout/Sidebar",
  component: StoryComponent,
  args: {
    isOpen: true,
    isExpanded: true,
    menuItems: [],
    effectiveTheme: "light",
    showAboutModal: false,
    onToggleSidebar: () => undefined,
    onMouseEnter: () => undefined,
    onMouseLeave: () => undefined,
    onItemClick: () => undefined,
    onToggleTheme: () => undefined,
    onOpenAbout: () => undefined,
    onCloseAbout: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/layout/Sidebar.view.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
