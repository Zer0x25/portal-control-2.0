import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./LiberalitasSignature";

const meta = {
  id: "certified-components-liberalitas-signature",
  title: "Design System/components/Liberalitas/Signature",
  component: StoryComponent,
  args: { author: "Portal Control", className: "text-xs" },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/LiberalitasSignature.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
