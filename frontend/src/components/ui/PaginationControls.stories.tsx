import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./PaginationControls";

const meta = {
  id: "certified-components-ui-pagination-controls",
  title: "Design System/components/ui/Pagination/Controls",
  component: StoryComponent,
  args: { currentPage: 2, totalPages: 5, setCurrentPage: () => undefined },
  argTypes: {
    currentPage: { control: { type: "number", min: 1 } },
    totalPages: { control: { type: "number", min: 1 } },
  },
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
export const FirstPage: Story = { args: { currentPage: 1, totalPages: 8 } };
export const LastPage: Story = { args: { currentPage: 8, totalPages: 8 } };
