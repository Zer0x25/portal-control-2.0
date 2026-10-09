import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router";
import ResponsiveView from "../../../components/ui/ResponsiveView";
import Container from "../../../components/ui/Container";
import PersistentLayoutView from "../../../components/layout/PersistentLayout.view";
import SidebarView from "../../../components/layout/Sidebar.view";
import HeaderView from "../../../components/layout/Header.view";
import SidebarNavItem from "../../../components/layout/SidebarNavItem";
import * as useMediaQueryModule from "../../../hooks/useMediaQuery";

// Mock children and subcomponents that require internal store/context
vi.mock("../../../components/layout/Header", () => ({
  default: () => <header data-testid="mock-header">Header</header>,
}));

vi.mock("../../../components/layout/NotificationCenter", () => ({
  default: () => <div data-testid="mock-notification-center" />,
}));

vi.mock("../../../components/layout/Sidebar", () => ({
  default: ({ isOpen }: { isOpen: boolean }) => (
    <aside data-testid="mock-sidebar" data-open={isOpen ? "true" : "false"}>
      Sidebar
    </aside>
  ),
}));

vi.mock("../../../components/ui/ScreenSizeIndicator", () => ({
  default: () => <div data-testid="mock-screen-indicator" />,
}));

describe("Responsive Layout & Viewport Coverage Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. ResponsiveView Component (Mobile vs Desktop Branching)", () => {
    it("renders only mobile content when viewport matches mobile media query", () => {
      vi.spyOn(useMediaQueryModule, "useMediaQuery").mockReturnValue(true);

      render(
        <ResponsiveView
          mobile={<div data-testid="mobile-branch">Mobile View</div>}
          desktop={<div data-testid="desktop-branch">Desktop View</div>}
        />,
      );

      expect(screen.getByTestId("mobile-branch")).toBeInTheDocument();
      expect(screen.queryByTestId("desktop-branch")).not.toBeInTheDocument();
    });

    it("renders only desktop content when viewport does not match mobile media query", () => {
      vi.spyOn(useMediaQueryModule, "useMediaQuery").mockReturnValue(false);

      render(
        <ResponsiveView
          mobile={<div data-testid="mobile-branch">Mobile View</div>}
          desktop={<div data-testid="desktop-branch">Desktop View</div>}
        />,
      );

      expect(screen.getByTestId("desktop-branch")).toBeInTheDocument();
      expect(screen.queryByTestId("mobile-branch")).not.toBeInTheDocument();
    });
  });

  describe("2. Canonical Container Viewport Elasticity", () => {
    it("provides fluid mobile-first lateral padding (px-4) scaling to tablet/desktop (sm:px-6 lg:px-8)", () => {
      render(
        <Container data-testid="tested-container">
          <span>Viewport Test</span>
        </Container>,
      );

      const el = screen.getByTestId("tested-container");
      expect(el).toHaveClass("w-full");
      expect(el).toHaveClass("mx-auto");
      expect(el).toHaveClass("px-4");
      expect(el).toHaveClass("sm:px-6");
      expect(el).toHaveClass("lg:px-8");
      expect(el).toHaveClass("max-w-7xl");
    });

    it("applies wide container max-width (1440px) for dense operational matrices", () => {
      render(
        <Container variant="wide" data-testid="wide-container">
          <span>Dense View</span>
        </Container>,
      );

      const el = screen.getByTestId("wide-container");
      expect(el).toHaveClass("max-w-[1440px]");
    });

    it("applies safe-area padding for PWA notches and home indicators", () => {
      render(
        <Container withSafeArea data-testid="safe-container">
          <span>PWA View</span>
        </Container>,
      );

      const el = screen.getByTestId("safe-container");
      expect(el).toHaveClass("pb-safe");
    });
  });

  describe("3. PersistentLayout Shell Adaptation", () => {
    const defaultLayoutProps = {
      currentPath: "/time-control",
      isSidebarOpen: false,
      isInitialSync: false,
      canShowDevPanel: false,
      showHomeFab: true,
      homeFabTitle: "Ir a Inicio",
      isHandoverModalOpen: false,
      handoverData: null,
      onToggleSidebar: vi.fn(),
      onOpenSidebarFromSwipe: vi.fn(),
      onGoHome: vi.fn(),
      onCloseHandoverModal: vi.fn(),
    };

    it("renders app-shell with dynamic viewport height (min-h-dvh h-dvh) and current path metadata", () => {
      render(
        <PersistentLayoutView {...defaultLayoutProps}>
          <div>Child Page</div>
        </PersistentLayoutView>,
      );

      const shell = screen.getByTestId("app-shell");
      expect(shell).toHaveClass("min-h-dvh");
      expect(shell).toHaveClass("h-dvh");
      expect(shell).toHaveAttribute("data-current-path", "/time-control");
    });

    it("exposes accessible skip-to-content link for keyboard users and headless agents", () => {
      render(
        <PersistentLayoutView {...defaultLayoutProps}>
          <div>Child Page</div>
        </PersistentLayoutView>,
      );

      const skipLink = screen.getByTestId("skip-to-content");
      expect(skipLink).toBeInTheDocument();
      expect(skipLink).toHaveAttribute("href", "#main-content");
    });

    it("renders main element with id, role, responsive padding, and centered max-width constraint", () => {
      render(
        <PersistentLayoutView {...defaultLayoutProps}>
          <div data-testid="page-content">Child Page</div>
        </PersistentLayoutView>,
      );

      const main = screen.getByTestId("main-content");
      expect(main).toHaveAttribute("id", "main-content");
      expect(main).toHaveAttribute("role", "main");
      // Mobile-first responsive padding
      expect(main).toHaveClass("p-4");
      expect(main).toHaveClass("sm:p-6");
      expect(main).toHaveClass("lg:p-8");
      expect(main).toHaveClass("pb-safe");

      // Centered content wrapper
      const content = screen.getByTestId("page-content").parentElement;
      expect(content).toHaveClass("max-w-[1440px]");
      expect(content).toHaveClass("mx-auto");
    });

    it("exposes mobile-friendly gestures area and separate mobile/desktop home action FABs", () => {
      render(
        <PersistentLayoutView {...defaultLayoutProps}>
          <div>Child Page</div>
        </PersistentLayoutView>,
      );

      expect(screen.getByTestId("sidebar-swipe-area")).toBeInTheDocument();
      expect(screen.getByTestId("home-fab-mobile")).toBeInTheDocument();
      expect(screen.getByTestId("home-fab-desktop")).toBeInTheDocument();
    });
  });

  describe("4. Header & Sidebar Headless Navigation Accessibility", () => {
    it("renders HeaderView with banner landmark and sidebar toggle button", () => {
      render(
        <HeaderView
          toggleSidebar={vi.fn()}
          currentUser={{ role: "Administrador" }}
          welcomeName="Admin User"
          systemStatus="online"
          soundEnabled={true}
          isDropdownOpen={false}
          isChangePasswordModalOpen={false}
          isManualModalOpen={false}
          dropdownRef={{ current: null }}
          onToggleSound={vi.fn()}
          onToggleDropdown={vi.fn()}
          onOpenChangePassword={vi.fn()}
          onOpenManual={vi.fn()}
          onCloseChangePassword={vi.fn()}
          onCloseManual={vi.fn()}
          onLogout={vi.fn()}
        />,
      );

      expect(screen.getByTestId("app-header")).toHaveAttribute("role", "banner");
      expect(screen.getByTestId("sidebar-toggle-button")).toHaveAttribute(
        "aria-controls",
        "app-sidebar",
      );
      expect(screen.getByTestId("user-menu-button")).toBeInTheDocument();
    });

    it("renders SidebarView with complementary landmark, navigation role, and dynamic height", () => {
      render(
        <SidebarView
          isOpen={true}
          isExpanded={true}
          menuItems={[]}
          effectiveTheme="light"
          showAboutModal={false}
          onToggleSidebar={vi.fn()}
          onMouseEnter={vi.fn()}
          onMouseLeave={vi.fn()}
          onItemClick={vi.fn()}
          onToggleTheme={vi.fn()}
          onOpenAbout={vi.fn()}
          onCloseAbout={vi.fn()}
        />,
      );

      const sidebar = screen.getByTestId("app-sidebar");
      expect(sidebar).toHaveAttribute("role", "complementary");
      expect(sidebar).toHaveClass("h-[calc(100dvh-4rem)]");

      const nav = screen.getByTestId("main-navigation");
      expect(nav).toHaveAttribute("role", "navigation");
      expect(nav).toHaveAttribute("aria-label", "Menú principal");
    });

    it("renders SidebarNavItem with deterministic data-testid, data-nav-to and data-nav-active attributes", () => {
      const MockIcon = () => <svg data-testid="icon" />;

      render(
        <MemoryRouter initialEntries={["/time-control"]}>
          <ul>
            <SidebarNavItem
              to="/time-control"
              icon={MockIcon}
              label="Control Asistencia"
              isExpanded={true}
              onClick={vi.fn()}
            />
          </ul>
        </MemoryRouter>,
      );

      const navItem = screen.getByTestId("nav-item-time-control");
      expect(navItem).toBeInTheDocument();
      expect(navItem).toHaveAttribute("data-nav-to", "/time-control");
      expect(navItem).toHaveAttribute("data-nav-label", "Control Asistencia");
    });
  });
});
