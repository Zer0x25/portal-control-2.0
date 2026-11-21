import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ResponsiveView";

const meta = {
  id: "certified-components-ui-responsive-view",
  title: "Design System/components/ui/Responsive/View",
  component: StoryComponent,
  args: {
    mobile: (
      <div className="rounded-xl border border-token-border-subtle bg-token-surface-card p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-token-accent-brand">
          Vista Móvil (&le; 768px)
        </p>
        <p className="mt-1 text-sm text-token-text-secondary">
          Layout compacto optimizado para tarjetas verticales.
        </p>
      </div>
    ),
    desktop: (
      <div className="rounded-xl border border-token-border-technical bg-token-surface-card p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-token-accent-brand">
          Vista Escritorio (&gt; 768px)
        </p>
        <p className="mt-1 text-sm text-token-text-secondary">
          Layout tabular extendido para operación en monitor completo.
        </p>
      </div>
    ),
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/components/ui/ResponsiveView.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithStatusCards: Story = {
  args: {
    mobile: (
      <div className="rounded-lg border border-token-status-info/30 bg-token-status-info-surface p-3 text-token-status-info-text text-xs font-bold uppercase tracking-wide">
        Modo tarjeta móvil activo
      </div>
    ),
    desktop: (
      <div className="rounded-lg border border-token-status-success/30 bg-token-status-success-surface p-4 text-token-status-success-text text-sm font-semibold">
        Modo tabla de escritorio activo (viewport &gt; 768px)
      </div>
    ),
  },
};
