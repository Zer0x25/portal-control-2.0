import React from "react";
import { useMediaQuery } from "../../hooks/useMediaQuery";

interface ResponsiveViewProps {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
}

const ResponsiveView: React.FC<ResponsiveViewProps> = ({ mobile, desktop }) => {
  const isMobile = useMediaQuery("(max-width: 768px)");
  return isMobile ? <>{mobile}</> : <>{desktop}</>;
};

export default ResponsiveView;
