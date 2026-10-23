import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./SortableHeader";

function SortableHeaderStory() {
  return (
    <table className="w-full">
      <thead>
        <tr>
          <StoryComponent<Record<string, unknown>>
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
const meta = {
  id: "certified-components-ui-sortable-header",
  title: "Design System/components/ui/Sortable/Header",
  component: SortableHeaderStory,
  tags: ["autodocs"],
} satisfies Meta<typeof SortableHeaderStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
