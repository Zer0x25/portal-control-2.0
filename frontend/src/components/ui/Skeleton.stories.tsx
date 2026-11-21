import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./Skeleton";

const meta = {
  id: "certified-components-ui-skeleton",
  title: "Design System/components/ui/Skeleton",
  component: StoryComponent,
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
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const AvatarCircle: Story = { args: { width: "3rem", height: "3rem", circle: true } };
export const CardPlaceholder: Story = { args: { width: "100%", height: "6rem", circle: false } };
