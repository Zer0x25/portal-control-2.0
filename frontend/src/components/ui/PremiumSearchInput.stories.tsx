import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./PremiumSearchInput";

const meta = {
  id: "certified-components-ui-premium-search-input",
  title: "Design System/components/ui/Premium/Search/Input",
  component: StoryComponent,
  args: { value: "Ana", onChange: () => undefined, placeholder: "Buscar personal…" },
  argTypes: {
    disabled: { control: "boolean" },
    shortcut: { control: "text" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/PremiumSearchInput.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
export const EmptyWithShortcut: Story = {
  args: { value: "", placeholder: "Buscar por RUT o nombre…", shortcut: "⌘K" },
};
export const Disabled: Story = {
  args: { value: "Sincronizando…", disabled: true },
};
