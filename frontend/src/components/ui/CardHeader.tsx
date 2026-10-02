import React from "react";

interface CardHeaderProps {
  title: string;
  children?: React.ReactNode; // For action buttons
}

const CardHeader: React.FC<CardHeaderProps> = ({ title, children }) => {
  return (
    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-sap-border dark:border-gray-600 flex justify-between items-center">
      <h3 className="text-lg font-medium leading-6 text-sap-dark-gray dark:text-gray-100">
        {title}
      </h3>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};

export default CardHeader;
