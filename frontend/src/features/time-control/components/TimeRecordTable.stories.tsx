import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./TimeRecordTable";

const meta = {
  id: "certified-features-time-control-components-time-record-table",
  title: "Design System/features/time-control/components/Time/Record/Table",
  component: StoryComponent,
  args: {
    records: [],
    fetchNextPage: () => undefined,
    hasNextPage: false,
    isFetchingNextPage: false,
    isLoading: false,
    onRowDoubleClick: () => undefined,
    onAddComment: () => undefined,
    onDelete: () => undefined,
    isActionDisabledForRole: false,
    roleBasedTooltip: "",
    accountingLockDate: null,
    isControlInternoEnabled: true,
    searchName: "",
    onSearchChange: () => undefined,
    onExportStreaming: () => undefined,
    onViewHistory: () => undefined,
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Archivo certificado: src/features/time-control/components/TimeRecordTable.tsx",
      },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
