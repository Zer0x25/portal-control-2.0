import { useState, useEffect } from "react";
import { WeatherData } from "../types/index";

/**
 * A custom hook to fetch (or simulate fetching) weather data.
 * @returns An object containing the weather data and a loading state.
 */
export const useWeather = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real application, you would make an API call here.
    // For this demo, we simulate a network request and provide sample data.
    const fetchWeatherData = () => {
      setIsLoading(true);
      setTimeout(() => {
        const conditions: WeatherData["condition"][] = ["Sunny", "Partly Cloudy", "Cloudy"];
        const randomCondition = conditions[Math.floor(Math.random() * conditions.length)];

        setWeather({
          location: "Santiago, CL",
          temperature: Math.floor(Math.random() * 6 + 17), // Random temp between 17°C and 22°C
          condition: randomCondition,
          uvIndex: Math.floor(Math.random() * 5 + 6), // Random UV index between 6 and 10 (High to Very High)
        });
        setIsLoading(false);
      }, 1200); // Simulate a 1.2-second network delay
    };

    fetchWeatherData();
  }, []);

  return { weather, isLoading };
};
