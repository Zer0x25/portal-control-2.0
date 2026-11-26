import type { Meta, StoryObj } from "@storybook/react-vite";
import DataTableRow from "./DataTableRow";

const meta = {
  id: "certified-components-ui-data-table-row",
  title: "Design System/components/ui/Data/Table/Row",
  component: DataTableRow,
  args: { rowIndex: 0, children: "Fila de ejemplo" },
  argTypes: {
    rowIndex: { control: { type: "number", min: 0 } },
    ariaRowIndex: { control: { type: "number", min: 1 } },
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/DataTableRow.tsx" } },
  },
} satisfies Meta<typeof DataTableRow>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const InsideTableStriped: Story = {
  render: () => (
    <table className="w-full border border-token-border-subtle rounded-lg overflow-hidden">
      <tbody>
        <DataTableRow rowIndex={0} className="bg-token-surface-card">
          <td className="px-4 py-2 text-token-text-primary">Ana Pérez</td>
          <td className="px-4 py-2 text-token-text-secondary">Operaciones</td>
        </DataTableRow>
        <DataTableRow rowIndex={1} ariaRowIndex={3} className="bg-token-surface-stripe">
          <td className="px-4 py-2 text-token-text-primary">Luis Soto</td>
          <td className="px-4 py-2 text-token-text-secondary">Mantención</td>
        </DataTableRow>
      </tbody>
    </table>
  ),
};
