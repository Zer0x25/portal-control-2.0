import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./TopLoadingBar.view";

const meta = {
  id: "certified-components-layout-top-loading-bar",
  title: "Design System/components/layout/Top/Loading/Bar",
  component: StoryComponent,
  argTypes: {
    loadingProgress: {
      control: { type: "range", min: 0, max: 100, step: 5 },
    },
    isGlobalLoading: { control: "boolean" },
    visible: { control: "boolean" },
    isInitialSync: { control: "boolean" },
  },
  args: {
    loadingProgress: 65,
    isGlobalLoading: true,
    visible: true,
    isInitialSync: false,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/layout/TopLoadingBar.view.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NearCompletion: Story = {
  args: {
    loadingProgress: 90,
  },
};

export const FadingOut: Story = {
  args: {
    loadingProgress: 100,
    isGlobalLoading: false,
  },
};

export const HiddenDuringInitialSync: Story = {
  args: {
    isInitialSync: true,
  },
};
