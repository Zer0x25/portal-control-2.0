import type { Meta, StoryObj } from "@storybook/react-vite";
import PersistentLayout from "./PersistentLayout.view";

const meta = {
  id: "certified-components-layout-persistent-layout",
  title: "Design System/components/layout/Persistent/Layout",
  component: PersistentLayout,
  args: {
    children: "Contenido de la vista",
    currentPath: "/dashboard",
    isSidebarOpen: false,
    isInitialSync: false,
    canShowDevPanel: false,
    showHomeFab: true,
    homeFabTitle: "Ir al inicio",
    isHandoverModalOpen: false,
    handoverData: null,
    onToggleSidebar: () => undefined,
    onSwipeTouchStart: () => undefined,
    onSwipeTouchEnd: () => undefined,
    onGoHome: () => undefined,
    onCloseHandoverModal: () => undefined,
  },
  argTypes: {
    currentPath: { control: "text" },
    isSidebarOpen: { control: "boolean" },
    isInitialSync: { control: "boolean" },
    showHomeFab: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/layout/PersistentLayout.view.tsx",
      },
    },
  },
} satisfies Meta<typeof PersistentLayout>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const SidebarOpenWithoutFab: Story = {
  args: {
    currentPath: "/supervisor-dashboard",
    isSidebarOpen: true,
    showHomeFab: false,
  },
};
