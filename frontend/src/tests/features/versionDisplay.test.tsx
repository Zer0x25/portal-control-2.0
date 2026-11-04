import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";

import AboutModalView from "../../components/ui/AboutModal.view";
import LoginPage from "../../features/auth/pages/LoginPage";
import { BUILD_VERSION } from "../../lib/buildVersion";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    login: vi.fn(),
    isAuthenticated: false,
    currentUser: null,
    mfaRequired: false,
    logout: vi.fn(),
  }),
}));

vi.mock("../../hooks/queries/useConfigQuery", () => ({
  useControlInternoEnabledQuery: () => ({ data: true }),
}));

vi.mock("../../hooks/useToasts", () => ({
  useToasts: () => ({ addToast: vi.fn() }),
}));

vi.mock("../../hooks/useAppForm", () => ({
  useAppForm: () => ({
    values: { username: "", password: "" },
    getError: () => undefined,
    isSubmitting: false,
    formProps: { onSubmit: (event: Event) => event.preventDefault() },
    setValue: vi.fn(),
  }),
}));

vi.mock("../../components/ui/SimpleConnectionIndicator", () => ({
  default: () => null,
}));

vi.mock("../../components/ui/BrandLogo", () => ({
  default: () => null,
}));

vi.mock("../../features/auth/components/MFALoginModal.container", () => ({
  default: () => null,
}));

describe("version display", () => {
  it("shows the repository build version on the login screen", () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    expect(screen.getByText(`v${BUILD_VERSION}`)).toBeInTheDocument();
  });

  it("shows the repository build version throughout the About modal", () => {
    render(
      <AboutModalView
        isOpen
        onClose={vi.fn()}
        showMonkey={false}
        onCloseMonkey={vi.fn()}
        onLogoClick={vi.fn()}
      />,
    );

    expect(screen.getByText(`Portal Modernizado v${BUILD_VERSION}`)).toBeInTheDocument();
    expect(screen.getByText(BUILD_VERSION)).toBeInTheDocument();
  });
});
