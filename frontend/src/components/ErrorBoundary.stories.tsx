import type { Meta, StoryObj } from "@storybook/react-vite";
import ErrorBoundary from "./ErrorBoundary";

const meta = {
  id: "certified-components-error-boundary",
  title: "Design System/components/Error/Boundary",
  component: ErrorBoundary,
  args: { children: "The child stays inside the error boundary." },
  argTypes: {
    children: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ErrorBoundary.tsx" } },
  },
} satisfies Meta<typeof ErrorBoundary>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithStructuredContent: Story = {
  args: {
    children: (
      <div className="p-4 rounded-md border border-token-border-subtle bg-token-surface-card text-token-text-primary text-sm">
        Contenido protegido dentro del límite de errores.
      </div>
    ),
  },
};
