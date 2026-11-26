import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { queryKeys } from "../../lib/queryKeys";
import type { BrandLogo as BrandLogoData } from "../../services/configService";
import BrandLogo from "./BrandLogo";

const SeededBrandLogoProvider = ({ children }: { children: ReactNode }) => {
  const [client] = useState(() => {
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    qc.setQueryData<BrandLogoData | null>(queryKeys.configPublic("branding_logo"), null);
    return qc;
  });

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const meta = {
  id: "certified-components-ui-brand-logo",
  title: "Design System/components/ui/Brand/Logo",
  component: BrandLogo,
  args: {
    className: "h-16 w-auto object-contain rounded-lg",
  },
  decorators: [
    (Story) => (
      <SeededBrandLogoProvider>
        <Story />
      </SeededBrandLogoProvider>
    ),
  ],
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/BrandLogo.tsx",
      },
    },
  },
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LargeHeader: Story = {
  args: {
    className: "h-24 w-auto object-contain rounded-xl",
  },
};
