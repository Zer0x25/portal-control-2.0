import type { Meta, StoryObj } from "@storybook/react-vite";
import SessionExpiredOverlay from "./SessionExpiredOverlay";

const meta = {
  id: "certified-components-ui-session-expired-overlay",
  title: "Design System/components/ui/Session/Expired/Overlay",
  component: SessionExpiredOverlay,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/SessionExpiredOverlay.tsx",
      },
    },
  },
} satisfies Meta<typeof SessionExpiredOverlay>;

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
