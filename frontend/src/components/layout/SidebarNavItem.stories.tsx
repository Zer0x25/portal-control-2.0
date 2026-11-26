import type { Meta, StoryObj } from "@storybook/react-vite";
import { HomeIcon } from "../ui/icons/index";
import StoryComponent from "./SidebarNavItem";

// El item es un <li> por contrato: siempre vive dentro del <ul> del sidebar.
// La historia envuelve el item para respetar ese contrato en aislamiento.
const NavList = ({ children }: { children: React.ReactNode }) => (
  <ul className="min-h-screen w-72 bg-token-surface-sidebar p-2">{children}</ul>
);

const meta = {
  id: "certified-components-layout-sidebar-nav-item",
  title: "Design System/components/layout/Sidebar/Nav/Item",
  component: StoryComponent,
  args: {
    to: "/dashboard",
    icon: HomeIcon,
    label: "Inicio",
    end: true,
    isExpanded: true,
    onClick: () => undefined,
  },
  argTypes: {
    label: { control: "text" },
    badge: { control: "text" },
    isExpanded: { control: "boolean" },
    end: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/layout/SidebarNavItem.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  decorators: [
    (Story) => (
      <NavList>
        <Story />
      </NavList>
    ),
  ],
};

export const WithBadge: Story = {
  args: {
    to: "/notifications",
    label: "Alertas",
    badge: "3",
    isExpanded: true,
  },
  decorators: [
    (Story) => (
      <NavList>
        <Story />
      </NavList>
    ),
  ],
};

export const Collapsed: Story = {
  args: {
    isExpanded: false,
  },
  decorators: [
    (Story) => (
      <NavList>
        <Story />
      </NavList>
    ),
  ],
};
