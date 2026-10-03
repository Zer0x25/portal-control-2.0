import React from "react";
import WeatherDisplay from "../../../components/ui/WeatherDisplay";
import ServerClock from "../../../components/ui/ServerClock";
import { WelcomeWidgetContainer } from "./ui/WidgetContainer";
import { useWelcomeLogic } from "../hooks/useWelcomeLogic";

const WelcomePanel: React.FC = () => {
  const { weather, isLoadingWeather, welcomeName, greeting } = useWelcomeLogic();

  return (
    <WelcomeWidgetContainer>
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-1 w-6 bg-sap-blue rounded-full opacity-80"></div>
            <p className="text-[11px] font-semibold text-token-text-tertiary uppercase tracking-wider leading-none">
              {greeting} • Dashboard Operativo
            </p>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-token-text-primary leading-tight tracking-tight">
            Hola,{" "}
            <span className="bg-clip-text text-transparent bg-linear-to-r from-sap-blue to-sap-light-blue">
              {welcomeName}
            </span>
          </h1>
        </div>

        <div className="bg-token-surface-card p-4 sm:p-5 rounded-sm flex items-center justify-between gap-5 sm:gap-8 border border-token-border-technical shadow-sm relative overflow-hidden group transition-all">
          <WeatherDisplay weather={weather} isLoading={isLoadingWeather} />

          <div className="w-px h-10 bg-token-border-subtle hidden xs:block"></div>

          <ServerClock
            containerClassName="text-right shrink-0"
            dateClassName="font-semibold text-[12px] text-token-text-tertiary uppercase tracking-wider mb-0.5 leading-none"
            timeClassName="font-bold text-2xl sm:text-4xl text-token-text-primary leading-none tabular-nums font-mono tracking-tighter"
          />
        </div>
      </div>
    </WelcomeWidgetContainer>
  );
};

export default WelcomePanel;
