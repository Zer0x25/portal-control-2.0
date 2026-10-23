import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordChangeForm as StoryComponent } from "./PasswordChangeForm";

const meta = {
  id: "certified-components-ui-password-change-form",
  title: "Design System/components/ui/Password/Change/Form",
  component: StoryComponent,
  args: {
    newPassword: "Portal2026!",
    setNewPassword: () => undefined,
    confirmPassword: "Portal2026!",
    setConfirmPassword: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/PasswordChangeForm.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
