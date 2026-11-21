import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./SessionExpiredOverlay";

const meta = {
  id: "certified-components-ui-session-expired-overlay",
  title: "Design System/components/ui/Session/Expired/Overlay",
  component: StoryComponent,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/SessionExpiredOverlay.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const CompactViewportFrame: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-sm mx-auto p-4">
        <Story />
      </div>
    ),
  ],
};
