import React from "react";
import { motion } from "framer-motion";

interface LiveStatusProps {
  label?: string;
  status?: "online" | "offline" | "warning";
  className?: string;
}

const LiveStatus: React.FC<LiveStatusProps> = ({
  label = "SISTEMA LIVE",
  status = "online",
  className = "",
}) => {
  const statusColors = {
    online: "bg-emerald-500",
    offline: "bg-red-500",
    warning: "bg-amber-500",
  };

  const color = statusColors[status];

  return (
    <div
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-white/40 dark:bg-white/3 border border-white/20 dark:border-white/5 backdrop-blur-md shadow-sm ${className}`}
    >
      <div className="relative flex h-2 w-2">
        <motion.span
          animate={{ scale: [1, 2, 1], opacity: [0.8, 0, 0.8] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${color}`}
        />
        <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
      </div>
      <span className="text-[10px] font-black tracking-[0.2em] text-gray-800 dark:text-gray-200 uppercase italic">
        {label}
      </span>
    </div>
  );
};

export default LiveStatus;
