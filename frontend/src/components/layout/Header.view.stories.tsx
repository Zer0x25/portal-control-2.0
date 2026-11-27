import type { Meta, StoryObj } from "@storybook/react-vite";
import { createRef } from "react";
import Header from "./Header.view";

// El boton de alternar menu declara `aria-controls="app-sidebar"`: en la app
// el aside vive en PersistentLayout. Para que la historia aislada respete el
// mismo contrato (y axe no reporte una referencia muerta), se provee el
// destino con el rol minimo.
const withSidebarTarget = (Story: () => React.ReactElement) => (
  <>
    <aside id="app-sidebar" hidden />
    <Story />
  </>
);

const meta = {
  id: "certified-components-layout-header",
  title: "Design System/components/layout/Header",
  component: Header,
  args: {
    toggleSidebar: () => undefined,
    currentUser: { role: "Super_Administrador" },
    welcomeName: "Ana Pérez",
    systemStatus: "Operativo",
    soundEnabled: true,
    isDropdownOpen: false,
    isChangePasswordModalOpen: false,
    canConfigureMfa: false,
    isMfaSetupModalOpen: false,
    isManualModalOpen: false,
    dropdownRef: createRef<HTMLDivElement>(),
    onToggleSound: () => undefined,
    onToggleDropdown: () => undefined,
    onOpenChangePassword: () => undefined,
    onOpenMfaSetup: () => undefined,
    onOpenManual: () => undefined,
    onCloseChangePassword: () => undefined,
    onCloseMfaSetup: () => undefined,
    onMfaSetupSuccess: () => undefined,
    onCloseManual: () => undefined,
    onLogout: () => undefined,
  },
  argTypes: {
    welcomeName: { control: "text" },
    systemStatus: { control: "text" },
    soundEnabled: { control: "boolean" },
    isDropdownOpen: { control: "boolean" },
    canConfigureMfa: { control: "boolean" },
  },
  tags: ["autodocs"],
  decorators: [withSidebarTarget],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/layout/Header.view.tsx" },
    },
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const UserMenuOpenMuted: Story = {
  args: {
    welcomeName: "Carlos Muñoz",
    systemStatus: "Sincronizando",
    soundEnabled: false,
    isDropdownOpen: true,
    canConfigureMfa: true,
    currentUser: { role: "Supervisor" },
  },
};
