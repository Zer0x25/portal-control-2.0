import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./SmtpConfigModal.view";

const meta = {
  id: "certified-features-configuration-components-smtp-config-modal",
  title: "Design System/features/configuration/components/Smtp/Config/Modal",
  component: StoryComponent,
  args: {
    isOpen: true,
    onClose: () => undefined,
    values: {
      host: "smtp.example.com",
      port: 587,
      secure: true,
      user: "operaciones",
      pass: "example",
      fromEmail: "operaciones@example.com",
      fromName: "Portal Control",
    },
    getError: () => undefined,
    handleFieldChange: () => undefined,
    applyPreset: () => undefined,
    handleTestConnection: async () => undefined,
    handleSetActive: () => undefined,
    selectSlot: () => undefined,
    currentSlot: 0,
    activeProfileIndex: 0,
    isLoading: false,
    isVerifying: false,
    isSubmitting: false,
    formProps: {
      id: "smtp-story",
      noValidate: true,
      onSubmit: () => undefined,
      "data-app-form": "storybook",
    },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Archivo certificado: src/features/configuration/components/SmtpConfigModal.view.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
