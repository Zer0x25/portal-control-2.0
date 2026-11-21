import type { Meta, StoryObj } from "@storybook/react-vite";
import { HomeIcon, ClockIcon, UsersIcon } from "../ui/icons/index";
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
  argTypes: {
    isOpen: { control: "boolean" },
    isExpanded: { control: "boolean" },
    effectiveTheme: { control: "inline-radio", options: ["light", "dark"] },
    showAboutModal: { control: "boolean" },
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

export const WithNavigationItems: Story = {
  args: {
    isOpen: true,
    isExpanded: true,
    menuItems: [
      { to: "/dashboard", icon: HomeIcon, label: "Inicio", end: true },
      { to: "/time-control", icon: ClockIcon, label: "Control de Tiempo" },
      { to: "/personnel", icon: UsersIcon, label: "Personal", badge: "2" },
    ],
  },
};

export const CollapsedDark: Story = {
  args: {
    isOpen: false,
    isExpanded: false,
    effectiveTheme: "dark",
    menuItems: [
      { to: "/dashboard", icon: HomeIcon, label: "Inicio", end: true },
      { to: "/time-control", icon: ClockIcon, label: "Control de Tiempo" },
    ],
  },
};
