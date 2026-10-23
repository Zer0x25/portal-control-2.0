import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./PersistentLayout.view";

const meta = {
  id: "certified-components-layout-persistent-layout",
  title: "Design System/components/layout/Persistent/Layout",
  component: StoryComponent,
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
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/layout/PersistentLayout.view.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
