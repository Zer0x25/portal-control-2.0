import type { Meta, StoryObj } from "@storybook/react-vite";
import LiberalitasSignature from "./LiberalitasSignature";

const meta = {
  id: "certified-components-liberalitas-signature",
  title: "Design System/components/Liberalitas/Signature",
  component: LiberalitasSignature,
  args: { author: "Portal Control", className: "text-xs" },
  argTypes: {
    author: { control: "text" },
    className: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/LiberalitasSignature.tsx" },
    },
  },
} satisfies Meta<typeof LiberalitasSignature>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const CustomAuthor: Story = {
  args: {
    author: "Jaime O. Mella V.",
    className: "text-sm font-semibold text-token-text-primary",
  },
};
