import React from "react";

export const BookOpenIcon: React.FC<{ className?: string; fill?: string }> = ({
  className,
  fill = "none",
}) => {
  if (fill !== "none" && fill !== "currentColor") {
    return (
      <svg
        width="32"
        height="32"
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        fill={fill}
        className={className || "w-8 h-8"}
      >
        <path d="M25,2H7A3,3,0,0,0,4,5V27a3,3,0,0,0,3,3h8V18.1a.5.5,0,0,1,.5-.5h3a.5.5,0,0,1,.5.5V30h3a3,3,0,0,0,3-3V5A3,3,0,0,0,25,2ZM18,29a1,1,0,0,1-1-1V18.1a1.5,1.5,0,0,0-1.5-1.5h-3A1.5,1.5,0,0,0,11,18.1V28a1,1,0,0,1-1,1H7a2,2,0,0,1-2-2V5A2,2,0,0,1,7,3H25a2,2,0,0,1,2,2V27a2,2,0,0,1-2-2Z" />
      </svg>
    );
  }
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill={"none"}
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className || "w-6 h-6"}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6-2.292m0 0V21M12 6.042A8.967 8.967 0 0 1 18 3.75m-6 2.292V3.75m0 2.292L6 3.75m6 2.292V21m0-14.25v4.493c1.605.57 3.036 1.401 4.237 2.409m-6.528-6.902L6 3.75"
      />
    </svg>
  );
};
