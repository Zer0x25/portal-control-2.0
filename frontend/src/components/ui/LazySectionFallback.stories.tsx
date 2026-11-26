import type { Meta, StoryObj } from "@storybook/react-vite";
import LazySectionFallback from "./LazySectionFallback";

const meta = {
  id: "certified-components-ui-lazy-section-fallback",
  title: "Design System/components/ui/Lazy/Section/Fallback",
  component: LazySectionFallback,
  args: {
    rows: 4,
  },
  argTypes: {
    rows: { control: { type: "number", min: 1, max: 8 } },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/LazySectionFallback.tsx",
      },
    },
  },
} satisfies Meta<typeof LazySectionFallback>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Compact: Story = {
  args: {
    rows: 2,
  },
};
