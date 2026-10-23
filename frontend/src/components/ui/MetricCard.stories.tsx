import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./MetricCard";

const meta = {
  id: "certified-components-ui-metric-card",
  title: "Design System/components/ui/Metric/Card",
  component: StoryComponent,
  tags: ["autodocs"],
} satisfies Meta<typeof StoryComponent>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  args: {
    kind: "metric",
    title: "Asistencia",
    value: "96%",
    label: "Esta semana",
    trend: { value: "+3.2%", isPositive: true },
    tone: "success",
  },
};
export const Panel: Story = {
  args: {
    kind: "panel",
    title: "Equipo",
    icon: <span aria-hidden="true">👥</span>,
    children: <p className="text-token-text-secondary">18 personas activas</p>,
  },
};
