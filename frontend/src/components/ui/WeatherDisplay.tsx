import React, { useState, useEffect } from "react";
import { motion, AnimatePresence, type MotionProps } from "framer-motion";
import { WeatherData } from "../../types/index";
import { SunIcon, CloudIcon, CloudRainIcon, PartlyCloudyIcon, UvIndexIcon } from "./icons/index";

interface WeatherDisplayProps {
  weather: WeatherData | null;
  isLoading: boolean;
}

const getUvInfo = (uvIndex: number): { text: string; colorClass: string } => {
  if (uvIndex <= 2) return { text: "Bajo", colorClass: "bg-green-500" };
  if (uvIndex <= 5) return { text: "Moderado", colorClass: "bg-yellow-500" };
  if (uvIndex <= 7) return { text: "Alto", colorClass: "bg-orange-500" };
  if (uvIndex <= 10) return { text: "Muy Alto", colorClass: "bg-red-500" };
  return { text: "Extremo", colorClass: "bg-purple-500" };
};

const WeatherIcon: React.FC<{ condition: WeatherData["condition"]; className?: string }> = ({
  condition,
  className,
}) => {
  switch (condition) {
    case "Sunny":
      return <SunIcon className={className} />;
    case "Cloudy":
      return <CloudIcon className={className} />;
    case "Rainy":
      return <CloudRainIcon className={className} />;
    case "Partly Cloudy":
      return <PartlyCloudyIcon className={className} />;
    default:
      return <SunIcon className={className} />;
  }
};

const WeatherDisplay: React.FC<WeatherDisplayProps> = ({ weather, isLoading }) => {
  const [displayMode, setDisplayMode] = useState<"temp" | "uv">("temp");

  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayMode((prev) => (prev === "temp" ? "uv" : "temp"));
    }, 5000); // Switch every 5 seconds

    return () => clearInterval(interval);
  }, []);

  if (isLoading || !weather) {
    return (
      <div className="flex items-center justify-center h-[60px] min-w-[100px] sm:w-[150px]">
        <div className="text-[10px] sm:text-xs text-gray-300 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  const uvInfo = getUvInfo(weather.uvIndex);

  const mainDisplayVariants = {
    initial: { opacity: 0, y: -10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 10 },
  };

  const motionProps: MotionProps = {
    initial: "initial",
    animate: "animate",
    exit: "exit",
    variants: mainDisplayVariants,
    transition: { duration: 0.4 },
  };

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="flex-shrink-0">
        <WeatherIcon
          condition={weather.condition}
          className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-300 dark:text-yellow-200"
        />
      </div>
      <div className="text-slate-900 dark:text-white text-left">
        <div className="font-black text-lg sm:text-2xl leading-none h-6 sm:h-8 flex items-center tracking-tighter">
          <AnimatePresence mode="wait" initial={false}>
            {displayMode === "temp" ? (
              <motion.div key="temp" {...motionProps}>
                {Math.round(weather.temperature)}°C
              </motion.div>
            ) : (
              <motion.div key="uv" {...motionProps}>
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest mr-1 text-slate-400 dark:text-gray-500">
                  UV
                </span>
                {weather.uvIndex}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest truncate max-w-[80px] sm:max-w-none">
          {weather.location}
        </p>
        <div className="flex items-center gap-1 mt-0.5 sm:mt-1" title={`Índice UV: ${uvInfo.text}`}>
          <UvIndexIcon className="w-3 h-3 text-slate-300 dark:text-gray-600" />
          <div className="w-8 sm:w-10 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`${uvInfo.colorClass} h-full rounded-full`}
              style={{ width: `${(Math.min(weather.uvIndex, 11) / 11) * 100}%` }}
            ></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeatherDisplay;
