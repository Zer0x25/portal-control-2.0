import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckCircleIcon } from "./icons/index";
import StoryComponent from "./IconBox";

const meta = {
  id: "certified-components-ui-icon-box",
  title: "Design System/components/ui/Icon/Box",
  component: StoryComponent,
  args: { icon: <CheckCircleIcon className="h-5 w-5" />, variant: "success", size: "md" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/IconBox.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
