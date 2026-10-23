import type { Meta, StoryObj } from "@storybook/react-vite";
import { createRef } from "react";
import StoryComponent from "./NotificationCenter.view";

const meta = {
  id: "certified-components-layout-notification-center",
  title: "Design System/components/layout/Notification/Center",
  component: StoryComponent,
  args: {
    isOpen: true,
    unreadCount: 0,
    notifications: [],
    dropdownRef: createRef<HTMLDivElement>(),
    onToggleOpen: () => undefined,
    onNotificationClick: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/layout/NotificationCenter.view.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
