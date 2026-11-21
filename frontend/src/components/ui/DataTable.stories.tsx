import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import DataTable from "./DataTable";
import DataTableHeader from "./DataTableHeader";
import DataTableRow from "./DataTableRow";

interface Person {
  name: string;
  area: string;
}
const rows: Person[] = [
  { name: "Ana Pérez", area: "Operaciones" },
  { name: "Luis Soto", area: "Mantención" },
];
const features = tableFeatures({ rowSortingFeature, sortedRowModel: createSortedRowModel() });
const helper = createColumnHelper<typeof features, Person>();
const columns = helper.columns([
  helper.accessor("name", { header: "Colaborador", enableSorting: true }),
  helper.accessor("area", { header: "Área", enableSorting: true }),
]);
function DataTableStory() {
  const table = useTable({ features, data: rows, columns });
  return (
    <DataTable table={table} ariaLabel="Personal" rowCount={rows.length}>
      <DataTableHeader table={table} />
      <tbody>
        {table.getRowModel().rows.map((row, index) => (
          <DataTableRow key={row.id} rowIndex={index}>
            {row.getAllCells().map((cell) => (
              <td key={cell.id} className="px-4 py-3 text-token-text-primary">
                {String(cell.getValue() ?? "")}
              </td>
            ))}
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

function DataTablePaginatedStory() {
  const table = useTable({ features, data: rows, columns });
  return (
    <DataTable
      table={table}
      ariaLabel="Personal paginado"
      rowCount={12}
      pagination={{
        currentPage: 1,
        totalPages: 4,
        setCurrentPage: () => undefined,
        position: "bottom",
      }}
    >
      <DataTableHeader table={table} />
      <tbody>
        {table.getRowModel().rows.map((row, index) => (
          <DataTableRow key={row.id} rowIndex={index}>
            {row.getAllCells().map((cell) => (
              <td key={cell.id} className="px-4 py-3 text-token-text-primary">
                {String(cell.getValue() ?? "")}
              </td>
            ))}
          </DataTableRow>
        ))}
      </tbody>
    </DataTable>
  );
}

const meta = {
  id: "certified-components-ui-data-table",
  title: "Design System/components/ui/Data/Table",
  component: DataTableStory,
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/DataTable.tsx" } },
  },
} satisfies Meta<typeof DataTableStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const WithPagination: Story = {
  render: () => <DataTablePaginatedStory />,
};
