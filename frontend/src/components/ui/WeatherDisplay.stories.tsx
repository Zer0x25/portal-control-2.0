import type { Meta, StoryObj } from "@storybook/react-vite";
import StoryComponent from "./WeatherDisplay";

const meta = {
  id: "certified-components-ui-weather-display",
  title: "Design System/components/ui/Weather/Display",
  component: StoryComponent,
  args: { weather: null, isLoading: true },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/WeatherDisplay.tsx" },
    },
  },
} satisfies Meta<typeof StoryComponent>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};
