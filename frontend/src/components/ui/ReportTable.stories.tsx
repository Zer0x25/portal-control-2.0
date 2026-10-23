import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./ReportTable";

const meta = {
  id: "certified-components-ui-report-table",
  title: "Design System/components/ui/Report/Table",
  component: StoryComponent,
  args: {
    reportData: null,
    isSingleEmployeeReport: false,
    sortConfig: null,
    requestSort: () => undefined,
    currentPage: 1,
    setCurrentPage: () => undefined,
    justificationStyles: {},
  },
  tags: ["autodocs"],
  parameters: {
    docs: { description: { component: "Archivo certificado: src/components/ui/ReportTable.tsx" } },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
