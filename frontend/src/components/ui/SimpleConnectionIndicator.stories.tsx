import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { READINESS_QUERY_KEY, type HealthReadinessData } from "../../hooks/queries/useHealthQuery";
import SimpleConnectionIndicator from "./SimpleConnectionIndicator";

const SeededReadinessProvider = ({
  healthStatus,
  children,
}: {
  healthStatus: "healthy" | "degraded";
  children: ReactNode;
}) => {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    qc.setQueryData<HealthReadinessData>(READINESS_QUERY_KEY, {
      status: "ready",
      healthStatus,
      instanceId: "storybook-preview",
    });
    return qc;
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const meta = {
  id: "certified-components-ui-simple-connection-indicator",
  title: "Design System/components/ui/Simple/Connection/Indicator",
  component: SimpleConnectionIndicator,
  decorators: [
    (Story) => (
      <div className="inline-flex">
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/SimpleConnectionIndicator.tsx",
      },
    },
  },
} satisfies Meta<typeof SimpleConnectionIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <SeededReadinessProvider healthStatus="healthy">
        <Story />
      </SeededReadinessProvider>
    ),
  ],
};

export const Degraded: Story = {
  decorators: [
    (Story) => (
      <SeededReadinessProvider healthStatus="degraded">
        <Story />
      </SeededReadinessProvider>
    ),
  ],
};
