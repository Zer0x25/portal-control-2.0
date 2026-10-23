import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./PaginationControls";

const meta = {
  id: "certified-components-ui-pagination-controls",
  title: "Design System/components/ui/Pagination/Controls",
  component: StoryComponent,
  args: { currentPage: 2, totalPages: 5, setCurrentPage: () => undefined },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/PaginationControls.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
