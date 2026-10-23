import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./DataTableRow";

const meta = {
  id: "certified-components-ui-data-table-row",
  title: "Design System/components/ui/Data/Table/Row",
  component: StoryComponent,
  args: { rowIndex: 0, children: "Fila de ejemplo" },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/DataTableRow.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
