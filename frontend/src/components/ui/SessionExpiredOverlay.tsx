import React from "react";
import { ShieldIcon } from "./icons";
import { motion } from "framer-motion";

const SessionExpiredOverlay: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gray-900/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl max-w-md w-full text-center border border-gray-100 dark:border-gray-700 relative overflow-hidden"
      >
        {/* Decorative background pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/10 rounded-full blur-3xl animate-pulse" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: [0, -10, 10, 0] }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6"
          >
            <ShieldIcon className="w-10 h-10 text-red-600 dark:text-red-400" />
          </motion.div>

          <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
            Sesión Expirada
          </h2>

          <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 px-4">
            Por tu seguridad, hemos cerrado tu sesión debido a inactividad o expiración de
            credenciales.
          </p>

          <div className="flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
            Cerrando sesión de forma segura...
          </div>
        </div>

        {/* Loading Bar at bottom */}
        <motion.div
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 3, ease: "linear" }}
          className="absolute bottom-0 left-0 h-1.5 bg-gradient-to-r from-red-500 to-orange-500"
        />
      </motion.div>
    </div>
  );
};

export default SessionExpiredOverlay;
