import type { Meta, StoryObj } from "@storybook/react-vite";
import Skeleton from "./Skeleton";

const meta = {
  id: "certified-components-ui-skeleton",
  title: "Design System/components/ui/Skeleton",
  component: Skeleton,
  args: { width: "12rem", height: "1rem" },
  argTypes: {
    circle: { control: "boolean" },
    width: { control: "text" },
    height: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/Skeleton.tsx" } },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const AvatarCircle: Story = { args: { width: "3rem", height: "3rem", circle: true } };
export const CardPlaceholder: Story = { args: { width: "100%", height: "6rem", circle: false } };
