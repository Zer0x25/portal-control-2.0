import type { Meta, StoryObj } from "@storybook/react-vite";
import SortableHeader from "./SortableHeader";

function SortableHeaderStory() {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <SortableHeader<Record<string, unknown>>
            title="Colaborador"
            sortKey="name"
            sortConfig={null}
            onSort={() => undefined}
          />
        </tr>
      </thead>
    </table>
  );
}
function SortableHeaderSortedStory({ direction }: { direction: "ascending" | "descending" }) {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <SortableHeader<Record<string, unknown>>
            title="Colaborador"
            sortKey="name"
            sortConfig={{ key: "name", direction }}
            onSort={() => undefined}
          />
          <SortableHeader<Record<string, unknown>>
            title="Área"
            sortKey="area"
            sortConfig={{ key: "name", direction }}
            onSort={() => undefined}
          />
        </tr>
      </thead>
    </table>
  );
}

const meta = {
  id: "certified-components-ui-sortable-header",
  title: "Design System/components/ui/Sortable/Header",
  component: SortableHeaderStory,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/SortableHeader.tsx" },
    },
  },
} satisfies Meta<typeof SortableHeaderStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const SortedAscending: Story = {
  render: () => <SortableHeaderSortedStory direction="ascending" />,
};

export const SortedDescending: Story = {
  render: () => <SortableHeaderSortedStory direction="descending" />,
};
