import type { Meta, StoryObj } from "@storybook/react-vite";
import { createRef } from "react";
import NotificationCenter from "./NotificationCenter.view";

const meta = {
  id: "certified-components-layout-notification-center",
  title: "Design System/components/layout/Notification/Center",
  component: NotificationCenter,
  args: {
    isOpen: true,
    unreadCount: 0,
    notifications: [],
    dropdownRef: createRef<HTMLDivElement>(),
    onToggleOpen: () => undefined,
    onNotificationClick: () => undefined,
  },
  argTypes: {
    isOpen: { control: "boolean" },
    unreadCount: { control: { type: "number", min: 0, max: 99 } },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/layout/NotificationCenter.view.tsx",
      },
    },
  },
} satisfies Meta<typeof NotificationCenter>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithUnreadNotifications: Story = {
  args: {
    isOpen: true,
    unreadCount: 3,
    notifications: [
      {
        id: "notif-1",
        type: "alert",
        title: "Anomalía de marcaje detectada",
        message: "Juan Pérez · Turno Nocturno",
        timestamp: Date.now() - 120000,
        isRead: false,
        link: "/time-control",
      },
      {
        id: "notif-2",
        type: "request",
        title: "Solicitud de corrección pendiente",
        message: "María González · 14:30",
        timestamp: Date.now() - 3600000,
        isRead: false,
        link: "/supervisor-dashboard",
      },
      {
        id: "notif-3",
        type: "communication",
        title: "Cierre mensual programado",
        message: "Operaciones · Hoy",
        timestamp: Date.now() - 7200000,
        isRead: true,
        link: "/communications",
      },
    ],
  },
};

export const ClosedBadgeOnly: Story = {
  args: {
    isOpen: false,
    unreadCount: 5,
  },
};
