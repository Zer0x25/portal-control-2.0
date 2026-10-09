import React from "react";

interface CardHeaderProps {
  title: string;
  children?: React.ReactNode; // For action buttons
}

const CardHeader: React.FC<CardHeaderProps> = ({ title, children }) => {
  return (
    <div className="px-4 py-3 bg-token-surface-header border-b border-token-border-technical flex justify-between items-center">
      <h3 className="text-lg font-medium leading-6 text-token-text-primary">{title}</h3>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};

export default CardHeader;
