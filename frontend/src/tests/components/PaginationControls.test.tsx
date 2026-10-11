import { expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PaginationControls from "../../components/ui/PaginationControls";

it("expone contrato DOM para agentes y navega entre páginas", () => {
  const setCurrentPage = vi.fn();
  const { rerender } = render(
    <PaginationControls currentPage={2} totalPages={5} setCurrentPage={setCurrentPage} />,
  );

  const root = screen.getByTestId("pagination");
  expect(root.getAttribute("data-page")).toBe("2");
  expect(root.getAttribute("data-total-pages")).toBe("5");

  fireEvent.click(screen.getByTestId("pagination-first"));
  expect(setCurrentPage).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByTestId("pagination-prev"));
  expect(setCurrentPage).toHaveBeenCalledWith(1);
  fireEvent.click(screen.getByTestId("pagination-next"));
  expect(setCurrentPage).toHaveBeenCalledWith(3);
  fireEvent.click(screen.getByTestId("pagination-last"));
  expect(setCurrentPage).toHaveBeenCalledWith(5);

  rerender(<PaginationControls currentPage={1} totalPages={1} setCurrentPage={setCurrentPage} />);
  expect(screen.queryByTestId("pagination")).toBeNull();
});
