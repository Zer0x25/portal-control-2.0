import type { Meta, StoryObj } from "@storybook/react-vite";
import SideDrawer from "./SideDrawer";

const sampleContent = (
  <div className="flex h-full flex-col">
    <div className="border-b border-token-border-technical px-6 py-4">
      <p className="text-xs font-semibold uppercase tracking-wider text-token-text-secondary">
        Panel lateral
      </p>
      <h2 className="mt-1 text-base font-bold text-token-text-primary">Detalle de registro</h2>
    </div>
    <div className="flex-1 space-y-3 p-6 text-sm text-token-text-secondary">
      <div className="rounded-md border border-token-border-subtle bg-token-surface-stripe p-4">
        Contenido contextual renderizado dentro de la primitiva SideDrawer con cierre por Escape y
        trampa de foco compartida.
      </div>
    </div>
  </div>
);

const meta = {
  id: "certified-components-ui-side-drawer",
  title: "Design System/components/ui/SideDrawer",
  component: SideDrawer,
  argTypes: {
    maxWidth: {
      control: "select",
      options: ["max-w-sm", "max-w-md", "max-w-lg", "max-w-xl"],
    },
    closeOnEscape: {
      control: "boolean",
    },
    ariaLabel: {
      control: "text",
    },
  },
  args: {
    isOpen: true,
    onClose: () => undefined,
    ariaLabel: "Panel lateral de detalle",
    maxWidth: "max-w-lg",
    closeOnEscape: true,
    children: sampleContent,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/SideDrawer.tsx" },
    },
  },
} satisfies Meta<typeof SideDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CompactPanel: Story = {
  args: {
    maxWidth: "max-w-md",
    ariaLabel: "Panel lateral compacto",
  },
};

export const DimBackdrop: Story = {
  args: {
    backdropClassName: "bg-black/50",
    closeOnEscape: false,
    ariaLabel: "Panel lateral con bloqueo de Escape",
  },
};
