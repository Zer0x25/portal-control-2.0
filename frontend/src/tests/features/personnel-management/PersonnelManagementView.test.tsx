import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PersonnelManagementView } from "../../../features/personnel-management/views/PersonnelManagement.view";

vi.mock("framer-motion", () => ({
  motion: {
    div: ({
      children,
      layoutId: _layoutId,
      ...props
    }: {
      children: React.ReactNode;
      layoutId?: string;
      [key: string]: unknown;
    }) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("PersonnelManagementView", () => {
  it("renders header and active tab content", () => {
    const setActiveTab = vi.fn();

    render(
      <PersonnelManagementView
        activeTab="employees"
        setActiveTab={setActiveTab}
        employeesContent={<div>EMPLOYEES-CONTENT-true</div>}
        usersContent={<div>USERS-CONTENT-true</div>}
      />,
    );

    expect(screen.getByText("Gestión de Personal")).toBeInTheDocument();
    expect(screen.getByText("Empleados")).toBeInTheDocument();
    expect(screen.getByText("Accesos")).toBeInTheDocument();
    expect(screen.getByText("EMPLOYEES-CONTENT-true")).toBeInTheDocument();
  });

  it("delegates tab changes", () => {
    const setActiveTab = vi.fn();

    render(
      <PersonnelManagementView
        activeTab="employees"
        setActiveTab={setActiveTab}
        employeesContent={<div>EMPLOYEES-CONTENT-true</div>}
        usersContent={<div>USERS-CONTENT-true</div>}
      />,
    );
    fireEvent.click(screen.getByText("Accesos"));

    expect(setActiveTab).toHaveBeenCalledWith("users");
  });
});
