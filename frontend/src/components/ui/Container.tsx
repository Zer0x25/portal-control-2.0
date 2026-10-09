import React from "react";

export type ContainerVariant = "standard" | "wide" | "narrow" | "fluid";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  variant?: ContainerVariant;
  noPadding?: boolean;
  withSafeArea?: boolean;
  as?: React.ElementType;
  className?: string;
  "data-testid"?: string;
}

const variantClasses: Record<ContainerVariant, string> = {
  standard: "max-w-7xl",
  wide: "max-w-[1440px]",
  narrow: "max-w-4xl",
  fluid: "max-w-none",
};

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
  (
    {
      children,
      variant = "standard",
      noPadding = false,
      withSafeArea = false,
      as: Component = "div",
      className = "",
      "data-testid": testId = "page-container",
      ...rest
    },
    ref,
  ) => {
    const paddingClass = noPadding ? "" : "px-4 sm:px-6 lg:px-8";
    const safeAreaClass = withSafeArea ? "pb-safe" : "";
    const maxWidthClass = variantClasses[variant];

    return (
      <Component
        ref={ref}
        data-testid={testId}
        className={`w-full mx-auto ${maxWidthClass} ${paddingClass} ${safeAreaClass} ${className}`.trim()}
        {...rest}
      >
        {children}
      </Component>
    );
  },
);

Container.displayName = "Container";

export default Container;
