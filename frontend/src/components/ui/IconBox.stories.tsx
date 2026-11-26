import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from "./icons/index";
import IconBox from "./IconBox";

const meta = {
  id: "certified-components-ui-icon-box",
  title: "Design System/components/ui/Icon/Box",
  component: IconBox,
  args: { icon: <CheckCircleIcon className="h-5 w-5" />, variant: "success", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "success", "warning", "danger", "neutral", "light"],
    },
    size: { control: "inline-radio", options: ["sm", "md", "lg"] },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/IconBox.tsx" } },
  },
} satisfies Meta<typeof IconBox>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const PrimarySmall: Story = {
  args: { icon: <InformationCircleIcon />, variant: "primary", size: "sm" },
};
export const WarningLarge: Story = {
  args: { icon: <ExclamationTriangleIcon />, variant: "warning", size: "lg" },
};
export const Danger: Story = {
  args: { icon: <ExclamationTriangleIcon />, variant: "danger", size: "md" },
};
