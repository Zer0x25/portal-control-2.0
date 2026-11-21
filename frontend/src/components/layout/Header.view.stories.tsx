import type { Meta, StoryObj } from "@storybook/react-vite";
import { createRef } from "react";
import StoryComponent from "./Header.view";

const meta = {
  id: "certified-components-layout-header",
  title: "Design System/components/layout/Header",
  component: StoryComponent,
  args: {
    toggleSidebar: () => undefined,
    currentUser: { role: "Administrador" },
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
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/layout/Header.view.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

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
