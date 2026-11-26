import type { Meta, StoryObj } from "@storybook/react-vite";
import WeatherDisplay from "./WeatherDisplay";

const meta = {
  id: "certified-components-ui-weather-display",
  title: "Design System/components/ui/Weather/Display",
  component: WeatherDisplay,
  args: { weather: null, isLoading: true },
  argTypes: {
    isLoading: { control: "boolean" },
  },
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: { component: "Archivo certificado: src/components/ui/WeatherDisplay.tsx" },
    },
  },
} satisfies Meta<typeof WeatherDisplay>;

export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {};

export const SunnyHighUV: Story = {
  args: {
    isLoading: false,
    weather: {
      location: "Santiago",
      temperature: 27,
      condition: "Sunny",
      uvIndex: 8,
    },
  },
};

export const RainyLowUV: Story = {
  args: {
    isLoading: false,
    weather: {
      location: "Concepción",
      temperature: 11,
      condition: "Rainy",
      uvIndex: 2,
    },
  },
};
