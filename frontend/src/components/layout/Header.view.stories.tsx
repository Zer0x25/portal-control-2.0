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
    isManualModalOpen: false,
    dropdownRef: createRef<HTMLDivElement>(),
    onToggleSound: () => undefined,
    onToggleDropdown: () => undefined,
    onOpenChangePassword: () => undefined,
    onOpenManual: () => undefined,
    onCloseChangePassword: () => undefined,
    onCloseManual: () => undefined,
    onLogout: () => undefined,
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
